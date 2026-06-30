import json
import math
import sys
from concurrent.futures import ThreadPoolExecutor


KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
TEMPERLEY_MAJOR_PROFILE = [
    0.748,
    0.060,
    0.488,
    0.082,
    0.670,
    0.460,
    0.096,
    0.715,
    0.104,
    0.366,
    0.057,
    0.400,
]
TEMPERLEY_MINOR_PROFILE = [
    0.712,
    0.084,
    0.474,
    0.618,
    0.049,
    0.460,
    0.105,
    0.747,
    0.404,
    0.067,
    0.133,
    0.330,
]
MIN_BPM = 60
MAX_BPM = 200
HIGH_RESOLUTION_SECONDS = 75
TEMPOGRAM_SECONDS = 90
BPM_ANALYSIS_SECONDS = 90
BPM_WINDOW_HOP_LENGTH = 1024
MIN_BPM_WINDOW_SECONDS = 35


def confidence_from_spread(best, second):
    if not math.isfinite(best):
        return 0
    if second == 0:
        return 72
    spread = max(0.0, best - second)
    return int(max(20, min(92, 45 + spread * 70)))


def fold_tempo(tempo):
    if not math.isfinite(float(tempo)) or tempo <= 0:
        return None

    value = float(tempo)
    while value < MIN_BPM:
        value *= 2
    while value > MAX_BPM:
        value /= 2

    if value < MIN_BPM or value > MAX_BPM:
        return None

    return int(round(value))


def add_tempo_candidate(candidates, tempo, weight):
    folded = fold_tempo(tempo)
    if folded is None:
        return

    candidates[folded] = candidates.get(folded, 0.0) + weight


def snap_common_bpm(bpm):
    nearest_five = int(round(bpm / 5) * 5)
    if bpm >= 130 and abs(nearest_five - bpm) <= 2:
        return nearest_five

    return int(bpm)


def merge_nearby_candidates(candidates, radius=3):
    if not candidates:
        return {}

    clusters = []
    current = []

    for bpm, score in sorted(candidates.items()):
        if current and bpm - current[-1][0] > radius:
            clusters.append(current)
            current = []
        current.append((bpm, score))

    if current:
        clusters.append(current)

    merged = {}
    for cluster in clusters:
        total_score = sum(score for _bpm, score in cluster)
        if total_score <= 0:
            continue
        weighted_bpm = sum(bpm * score for bpm, score in cluster) / total_score
        rounded_bpm = int(round(weighted_bpm))
        merged[rounded_bpm] = merged.get(rounded_bpm, 0.0) + total_score

    return merged


def metrical_bonus(candidates):
    adjusted = dict(candidates)
    for bpm, score in candidates.items():
        if bpm < 70 or bpm > 115:
            continue

        for other_bpm, other_score in candidates.items():
            if other_bpm == bpm:
                continue

            if abs(other_bpm - bpm * 2) <= 3:
                if bpm < 90 and 145 <= other_bpm <= 180:
                    adjusted[other_bpm] = adjusted.get(other_bpm, 0.0) + score * 0.4
                    adjusted[bpm] = adjusted.get(bpm, 0.0) + other_score * 0.12
                else:
                    adjusted[bpm] = adjusted.get(bpm, 0.0) + other_score * 0.2
                    adjusted[other_bpm] = adjusted.get(other_bpm, 0.0) + score * 0.1
            elif abs(other_bpm - bpm * 4 / 3) <= 3:
                adjusted[bpm] = adjusted.get(bpm, 0.0) + other_score * 0.16

    return adjusted


def add_tempo_family(pool, tempo):
    if tempo is None:
        return

    for factor in (1.0, 2.0, 0.5, 1.5, 2 / 3, 4 / 3, 0.75):
        folded = fold_tempo(float(tempo) * factor)
        if folded is not None:
            pool.add(folded)


def dot_lag_score(onset_env, lag, np):
    if lag <= 0 or lag >= onset_env.size:
        return 0.0

    energy = float(np.dot(onset_env, onset_env)) + 1e-9
    return float(np.dot(onset_env[:-lag], onset_env[lag:]) / energy)


def local_lag_score(onset_env, period_frames, np):
    center = int(round(period_frames))
    if center <= 0:
        return 0.0

    scores = []
    for offset in range(-3, 4):
        lag = center + offset
        scores.append(dot_lag_score(onset_env, lag, np))

    return max(scores) if scores else 0.0


def segment_stability_score(onset_env, period_frames, np):
    segments = [segment for segment in np.array_split(onset_env, 5) if segment.size > 32]
    if not segments:
        return 0.0

    scores = [local_lag_score(segment, period_frames, np) for segment in segments]
    mean_score = float(np.mean(scores))
    spread = float(np.std(scores))
    return max(0.0, mean_score - spread * 0.35)


def peak_alignment_score(onset_env, period_frames, np):
    if period_frames <= 0 or onset_env.size < 8:
        return 0.0

    threshold = float(np.percentile(onset_env, 82))
    middle = onset_env[1:-1]
    peak_indexes = np.where(
        (middle >= onset_env[:-2]) & (middle > onset_env[2:]) & (middle >= threshold)
    )[0] + 1
    if peak_indexes.size < 4:
        return 0.0

    weights = onset_env[peak_indexes]
    if float(weights.sum()) <= 0:
        return 0.0

    order = np.argsort(weights)[::-1][:180]
    peak_indexes = peak_indexes[order].astype(float)
    weights = weights[order]
    phase_candidates = (peak_indexes[: min(28, peak_indexes.size)] % period_frames).tolist()
    tolerance = max(1.8, period_frames * 0.11)
    weight_sum = float(weights.sum()) + 1e-9
    best = 0.0

    for phase in phase_candidates:
        distance = np.abs(((peak_indexes - phase + period_frames / 2) % period_frames) - period_frames / 2)
        score = float(np.sum(weights * np.exp(-0.5 * (distance / tolerance) ** 2)) / weight_sum)
        if score > best:
            best = score

    return best


def score_bpm_grid(y, sr, librosa, np, percussive_source=None, window_weight=1.0):
    sample_length = min(y.size, int(sr * max(TEMPOGRAM_SECONDS, HIGH_RESOLUTION_SECONDS)))
    if sample_length <= 0:
        return {}

    sample = y[:sample_length]
    if percussive_source is not None and percussive_source.size > 0:
        percussive = percussive_source[:sample_length]
    else:
        percussive = librosa.effects.percussive(sample)
    if percussive.size == 0 or float(np.max(np.abs(percussive))) <= 0:
        percussive = sample

    hop_length = 256
    try:
        onset_env = librosa.onset.onset_strength(
            y=percussive,
            sr=sr,
            hop_length=hop_length,
            aggregate=np.median,
        )
    except TypeError:
        onset_env = librosa.onset.onset_strength(y=percussive, sr=sr, hop_length=hop_length)

    if onset_env.size == 0 or float(np.max(onset_env)) <= 0:
        return {}

    onset_env = np.maximum(onset_env - float(np.percentile(onset_env, 45)), 0.0)
    peak = float(np.max(onset_env))
    if peak <= 0:
        return {}

    onset_env = onset_env / peak
    raw_scores = {}

    for bpm in range(MIN_BPM, MAX_BPM + 1):
        period_frames = 60.0 * sr / (hop_length * bpm)
        autocorr = local_lag_score(onset_env, period_frames, np)
        stability = segment_stability_score(onset_env, period_frames, np)
        alignment = peak_alignment_score(onset_env, period_frames, np)
        raw_scores[bpm] = autocorr * 0.48 + stability * 0.22 + alignment * 0.30

    top_score = max(raw_scores.values()) if raw_scores else 0.0
    if top_score <= 0:
        return {}

    normalized = {bpm: score / top_score for bpm, score in raw_scores.items()}
    smoothed = {}
    for bpm, score in normalized.items():
        neighbor_score = (
            normalized.get(bpm - 1, score) * 0.25
            + score * 0.5
            + normalized.get(bpm + 1, score) * 0.25
        )
        smoothed[bpm] = neighbor_score * window_weight

    return smoothed


def merge_score_map(target, source):
    for bpm, score in source.items():
        target[bpm] = target.get(bpm, 0.0) + score


def combine_candidate_and_validation_scores(candidates, validation_scores):
    if not validation_scores:
        return candidates

    max_candidate_score = max(candidates.values()) if candidates else 0.0
    sorted_candidates = sorted(candidates.items(), key=lambda item: item[1], reverse=True)
    sorted_validation = sorted(validation_scores.items(), key=lambda item: item[1], reverse=True)
    pool = set(candidates.keys())

    for bpm, _score in sorted_candidates[:12]:
        add_tempo_family(pool, bpm)

    for bpm, _score in sorted_validation[:18]:
        add_tempo_family(pool, bpm)

    combined = {}
    for bpm in pool:
        prior = candidates.get(bpm, 0.0) / max_candidate_score if max_candidate_score > 0 else 0.0
        family_prior = 0.0
        for source_bpm, source_score in sorted_candidates[:10]:
            related = (
                abs(bpm - source_bpm * 2) <= 2
                or abs(bpm * 2 - source_bpm) <= 2
                or abs(bpm - source_bpm * 1.5) <= 2
                or abs(bpm * 1.5 - source_bpm) <= 2
            )
            if related and max_candidate_score > 0:
                family_prior = max(family_prior, (source_score / max_candidate_score) * 0.62)

        validation = validation_scores.get(bpm, 0.0)
        neighbor_validation = max(
            validation,
            validation_scores.get(bpm - 1, 0.0) * 0.92,
            validation_scores.get(bpm + 1, 0.0) * 0.92,
        )
        common_tempo_bonus = 0.035 if bpm % 5 == 0 and bpm >= 120 else 0.0
        high_energy_bonus = 0.045 if 135 <= bpm <= 180 else 0.0
        combined[bpm] = (
            prior * 0.34
            + family_prior * 0.16
            + neighbor_validation * 0.54
            + common_tempo_bonus
            + high_energy_bonus
        )

    return combined


def select_high_energy_window_range(y, sr, librosa, np):
    max_length = int(sr * BPM_ANALYSIS_SECONDS)
    if y.size <= max_length or max_length <= 0:
        return 0, y.size

    try:
        onset_env = librosa.onset.onset_strength(
            y=y,
            sr=sr,
            hop_length=BPM_WINDOW_HOP_LENGTH,
        )
    except Exception:
        return 0, max_length

    if onset_env.size == 0 or float(np.max(onset_env)) <= 0:
        return 0, max_length

    frames_per_window = max(
        1,
        int(round(BPM_ANALYSIS_SECONDS * sr / BPM_WINDOW_HOP_LENGTH)),
    )
    if onset_env.size <= frames_per_window:
        return 0, max_length

    energy = np.maximum(onset_env - float(np.percentile(onset_env, 35)), 0.0)
    kernel = np.ones(frames_per_window)
    window_scores = np.convolve(energy, kernel, mode="valid")
    best_frame = int(np.argmax(window_scores))
    start_sample = max(0, best_frame * BPM_WINDOW_HOP_LENGTH)
    end_sample = min(y.size, start_sample + max_length)

    if end_sample - start_sample < max_length:
        start_sample = max(0, y.size - max_length)
        end_sample = y.size

    return start_sample, end_sample


def build_bpm_analysis_windows(y, sr, librosa, np, percussive):
    min_length = int(sr * MIN_BPM_WINDOW_SECONDS)
    max_length = min(y.size, int(sr * BPM_ANALYSIS_SECONDS))
    if y.size <= 0 or max_length <= 0:
        return []

    ranges = []

    def add_window(name, start, length, weight):
        start = int(max(0, min(start, max(0, y.size - min(length, y.size)))))
        end = int(min(y.size, start + length))
        if end - start < min_length:
            return

        for existing in ranges:
            _name, existing_start, existing_end, _weight = existing
            overlap = max(0, min(end, existing_end) - max(start, existing_start))
            smaller = max(1, min(end - start, existing_end - existing_start))
            if overlap / smaller > 0.82:
                return

        ranges.append((name, start, end, weight))

    high_start, high_end = select_high_energy_window_range(y, sr, librosa, np)
    add_window("high_energy", high_start, high_end - high_start, 1.42)

    if y.size <= max_length:
        add_window("full", 0, y.size, 1.0)
    else:
        add_window("early", 0, max_length, 0.72)
        add_window("middle", (y.size - max_length) // 2, max_length, 1.0)
        add_window("late", y.size - max_length, max_length, 0.9)

    windows = []
    for name, start, end, weight in ranges:
        windows.append(
            {
                "name": name,
                "signal": y[start:end],
                "percussive": percussive[start:end] if percussive.size >= end else None,
                "weight": weight,
            }
        )

    return windows


def add_high_resolution_percussive_candidates(
    candidates,
    y,
    sr,
    librosa,
    np,
    percussive_source=None,
    window_weight=1.0,
):
    sample_length = min(y.size, int(sr * HIGH_RESOLUTION_SECONDS))
    if sample_length <= 0:
        return

    sample = y[:sample_length]
    if percussive_source is not None and percussive_source.size > 0:
        percussive = percussive_source[:sample_length]
    else:
        percussive = librosa.effects.percussive(sample)
    if percussive.size == 0 or float(np.max(np.abs(percussive))) <= 0:
        return

    hop_length = 256
    onset_env = librosa.onset.onset_strength(y=percussive, sr=sr, hop_length=hop_length)
    if float(np.max(onset_env)) <= 0:
        return

    try:
        frame_tempos = librosa.feature.tempo(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=hop_length,
            aggregate=None,
            max_tempo=260,
        )
        if frame_tempos.size > 0:
            rounded_tempos = np.round(frame_tempos).astype(int)
            values, counts = np.unique(rounded_tempos, return_counts=True)
            ranked = sorted(
                zip(values.tolist(), counts.tolist()),
                key=lambda item: item[1],
                reverse=True,
            )
            total = max(1, int(counts.sum()))
            for tempo, count in ranked[:5]:
                add_tempo_candidate(
                    candidates,
                    float(tempo),
                    min(10.0, 18.0 * count / total) * window_weight,
                )
    except Exception:
        pass

    for start_bpm in (120, 135, 150, 155, 165, 180):
        try:
            tempo_raw = librosa.feature.tempo(
                onset_envelope=onset_env,
                sr=sr,
                hop_length=hop_length,
                start_bpm=start_bpm,
                max_tempo=260,
                aggregate=np.median,
            )
            add_tempo_candidate(
                candidates,
                float(np.asarray(tempo_raw).reshape(-1)[0]),
                4.8 * window_weight,
            )
        except Exception:
            pass


def add_tempogram_candidates(
    candidates,
    y,
    sr,
    librosa,
    np,
    percussive_source=None,
    window_weight=1.0,
):
    sample_length = min(y.size, int(sr * TEMPOGRAM_SECONDS))
    if sample_length <= 0:
        return

    sample = y[:sample_length]
    if percussive_source is not None and percussive_source.size > 0:
        percussive = percussive_source[:sample_length]
    else:
        percussive = librosa.effects.percussive(sample)
    signals = [
        (percussive if percussive.size > 0 else sample, 1.55),
    ]

    for signal, signal_weight in signals:
        if signal.size == 0 or float(np.max(np.abs(signal))) <= 0:
            continue

        for hop_length, hop_weight in ((512, 1.0),):
            try:
                onset_env = librosa.onset.onset_strength(
                    y=signal,
                    sr=sr,
                    hop_length=hop_length,
                )
                if float(np.max(onset_env)) <= 0:
                    continue

                tempogram = librosa.feature.tempogram(
                    onset_envelope=onset_env,
                    sr=sr,
                    hop_length=hop_length,
                    win_length=384,
                )
                if tempogram.size == 0:
                    continue

                autocorrelation = np.mean(tempogram, axis=1)
                tempo_bins = librosa.tempo_frequencies(
                    len(autocorrelation),
                    sr=sr,
                    hop_length=hop_length,
                )
                valid = np.where((tempo_bins >= MIN_BPM) & (tempo_bins <= MAX_BPM))[0]
                if valid.size == 0:
                    continue

                valid_scores = autocorrelation[valid]
                ranked_positions = np.argsort(valid_scores)[::-1][:6]
                top_score = float(valid_scores[ranked_positions[0]]) if ranked_positions.size else 0.0
                if top_score <= 0:
                    continue

                for rank, position in enumerate(ranked_positions):
                    tempo = float(tempo_bins[valid[position]])
                    score = float(valid_scores[position])
                    rank_weight = max(0.35, 1.0 - rank * 0.12)
                    add_tempo_candidate(
                        candidates,
                        tempo,
                        5.5
                        * signal_weight
                        * hop_weight
                        * rank_weight
                        * (score / top_score)
                        * window_weight,
                    )
            except Exception:
                pass


def choose_bpm_candidate(candidates):
    sorted_candidates = sorted(candidates.items(), key=lambda item: item[1], reverse=True)
    if not sorted_candidates:
        return None

    bpm, score = sorted_candidates[0]

    if 95 <= bpm <= 115:
        for high_bpm, high_score in sorted_candidates[1:]:
            ratio = high_bpm / bpm
            if 145 <= high_bpm <= 170 and abs(ratio - 1.5) <= 0.08 and high_score >= score * 0.72:
                return high_bpm, high_score, sorted_candidates

    if 70 <= bpm <= 85:
        for high_bpm, high_score in sorted_candidates[1:]:
            ratio = high_bpm / bpm
            if 145 <= high_bpm <= 170 and abs(ratio - 2.0) <= 0.08 and high_score >= score * 0.55:
                return high_bpm, high_score, sorted_candidates

    return bpm, score, sorted_candidates


def build_bpm_alternatives(chosen_bpm, chosen_score, chosen_confidence, sorted_candidates):
    if chosen_bpm is None or chosen_score <= 0:
        return []

    chosen_display = snap_common_bpm(chosen_bpm)
    alternatives = []
    seen = {chosen_display}

    for bpm, score in sorted_candidates:
        display_bpm = snap_common_bpm(bpm)
        if any(abs(display_bpm - seen_bpm) <= 2 for seen_bpm in seen):
            continue

        score_ratio = score / chosen_score
        if score_ratio < 0.64:
            continue

        confidence = int(max(1, min(88, round(chosen_confidence * min(score_ratio, 0.95)))))
        if confidence < 50:
            continue

        alternatives.append(
            {
                "bpm": display_bpm,
                "confidence": confidence,
            }
        )
        seen.add(display_bpm)

        if len(alternatives) >= 3:
            break

    return alternatives


def choose_scored_bpm(candidates, validation_scores):
    scored_candidates = metrical_bonus(candidates)
    scored_candidates = merge_nearby_candidates(scored_candidates)
    scored_candidates = combine_candidate_and_validation_scores(
        scored_candidates,
        validation_scores,
    )
    chosen = choose_bpm_candidate(scored_candidates)
    if chosen is None:
        return None, 0, []

    bpm, score, sorted_candidates = chosen
    runner_up = sorted_candidates[1][1] if len(sorted_candidates) > 1 else 0.0
    margin = (score - runner_up) / score if score > 0 else 0.0
    validation = max(
        validation_scores.get(bpm, 0.0),
        validation_scores.get(bpm - 1, 0.0) * 0.92,
        validation_scores.get(bpm + 1, 0.0) * 0.92,
    )
    confidence = int(
        max(
            28,
            min(94, 32 + min(score, 1.2) * 12 + validation * 36 + margin * 24),
        )
    )
    alternatives = build_bpm_alternatives(bpm, score, confidence, sorted_candidates)

    return snap_common_bpm(bpm), confidence, alternatives


def collect_bpm_candidates(candidates, y, sr, librosa, np, percussive=None, window_weight=1.0):
    if percussive is None or percussive.size == 0 or float(np.max(np.abs(percussive))) <= 0:
        percussive = librosa.effects.percussive(y)

    signals = [
        ("percussive", percussive, 1.4, (70, 80, 90, 100, 120, 140, 155, 160, 180), (80, 100, 120, 140, 155, 160, 180)),
        ("full", y, 1.0, (80, 100, 120, 140, 155, 160), (100, 120, 140, 155, 160)),
    ]

    for _name, signal, signal_weight, tempo_starts, beat_starts in signals:
        if signal.size == 0 or float(np.max(np.abs(signal))) <= 0:
            continue

        onset_env = librosa.onset.onset_strength(y=signal, sr=sr)
        if float(np.max(onset_env)) <= 0:
            continue

        try:
            frame_tempos = librosa.feature.tempo(
                onset_envelope=onset_env,
                sr=sr,
                aggregate=None,
                max_tempo=260,
            )
            step = max(1, len(frame_tempos) // 80)
            for tempo in frame_tempos[::step]:
                add_tempo_candidate(candidates, float(tempo), 0.12 * signal_weight * window_weight)
        except Exception:
            pass

        for start_bpm in tempo_starts:
            try:
                tempo_raw = librosa.feature.tempo(
                    onset_envelope=onset_env,
                    sr=sr,
                    start_bpm=start_bpm,
                    max_tempo=260,
                    aggregate=np.median,
                )
                add_tempo_candidate(
                    candidates,
                    float(np.asarray(tempo_raw).reshape(-1)[0]),
                    1.8 * signal_weight * window_weight,
                )
            except Exception:
                pass

        for start_bpm in beat_starts:
            try:
                tempo_raw, _beats = librosa.beat.beat_track(
                    y=signal,
                    sr=sr,
                    onset_envelope=onset_env,
                    start_bpm=start_bpm,
                )
                add_tempo_candidate(
                    candidates,
                    float(np.asarray(tempo_raw).reshape(-1)[0]),
                    2.8 * signal_weight * window_weight,
                )
            except Exception:
                pass


def estimate_bpm(y, sr, librosa, np):
    candidates = {}
    percussive = librosa.effects.percussive(y)
    if percussive.size == 0 or float(np.max(np.abs(percussive))) <= 0:
        percussive = y

    windows = build_bpm_analysis_windows(y, sr, librosa, np, percussive)
    if not windows:
        windows = [{"name": "full", "signal": y, "percussive": percussive, "weight": 1.0}]

    validation_scores = {}
    for window in windows:
        signal = window["signal"]
        percussive_signal = window["percussive"]
        weight = window["weight"]
        collect_bpm_candidates(
            candidates,
            signal,
            sr,
            librosa,
            np,
            percussive_signal,
            weight,
        )
        merge_score_map(
            validation_scores,
            score_bpm_grid(
                signal,
                sr,
                librosa,
                np,
                percussive_signal,
                weight,
            ),
        )

    if not candidates:
        return None, 0, []

    bpm, confidence, alternatives = choose_scored_bpm(candidates, validation_scores)
    deep_windows = windows[:3] if windows else []
    if bpm is None or confidence < 88:
        for window in deep_windows:
            add_high_resolution_percussive_candidates(
                candidates,
                window["signal"],
                sr,
                librosa,
                np,
                window["percussive"],
                window["weight"],
            )
            add_tempogram_candidates(
                candidates,
                window["signal"],
                sr,
                librosa,
                np,
                window["percussive"],
                window["weight"],
            )

    return choose_scored_bpm(candidates, validation_scores)


def key_scores(chroma_vector, np):
    if float(chroma_vector.sum()) == 0:
        return []

    chroma_norm = chroma_vector / (np.linalg.norm(chroma_vector) + 1e-9)
    profile_sets = [
        (MAJOR_PROFILE, MINOR_PROFILE, 1.0),
        (TEMPERLEY_MAJOR_PROFILE, TEMPERLEY_MINOR_PROFILE, 0.85),
    ]
    score_map = {}

    for major_values, minor_values, profile_weight in profile_sets:
        major_profile = np.array(major_values)
        minor_profile = np.array(minor_values)
        major_profile = major_profile / np.linalg.norm(major_profile)
        minor_profile = minor_profile / np.linalg.norm(minor_profile)

        for index, key_name in enumerate(KEY_NAMES):
            major_key = f"{key_name} major"
            minor_key = f"{key_name} minor"
            major_score = float(np.dot(chroma_norm, np.roll(major_profile, index)))
            minor_score = float(np.dot(chroma_norm, np.roll(minor_profile, index)))
            score_map[major_key] = score_map.get(major_key, 0.0) + major_score * profile_weight
            score_map[minor_key] = score_map.get(minor_key, 0.0) + minor_score * profile_weight

    scores = [(score, key_name) for key_name, score in score_map.items()]
    scores.sort(reverse=True, key=lambda item: item[0])
    return scores


def detect_key(chroma, np):
    if chroma.size == 0:
        return None, 0

    frame_energy = chroma.sum(axis=0)
    if float(frame_energy.sum()) == 0:
        return None, 0

    threshold = float(np.percentile(frame_energy, 35))
    filtered = chroma[:, frame_energy >= threshold]
    if filtered.size == 0:
        filtered = chroma

    votes = {}

    def add_vote(scores, weight):
        for score, key_name in scores[:4]:
            votes[key_name] = votes.get(key_name, 0.0) + max(0.0, float(score)) * weight

    add_vote(key_scores(filtered.mean(axis=1), np), 4.0)

    segment_count = min(10, max(1, filtered.shape[1] // 110))
    for segment in np.array_split(filtered, segment_count, axis=1):
        if segment.shape[1] < 8:
            continue
        add_vote(key_scores(segment.mean(axis=1), np), 1.55)

    if not votes:
        return None, 0

    sorted_votes = sorted(votes.items(), key=lambda item: item[1], reverse=True)
    best = sorted_votes[0]
    second = sorted_votes[1] if len(sorted_votes) > 1 else ("", 0.0)
    spread = (best[1] - second[1]) / (best[1] + 1e-9)
    confidence = int(max(20, min(90, 38 + spread * 75 + min(segment_count, 8) * 1.6)))
    return best[0], confidence


def add_key_votes_from_chroma(chroma, np, votes, weight):
    if chroma.size == 0:
        return 0

    frame_energy = chroma.sum(axis=0)
    if float(frame_energy.sum()) == 0:
        return 0

    threshold = float(np.percentile(frame_energy, 35))
    filtered = chroma[:, frame_energy >= threshold]
    if filtered.size == 0:
        filtered = chroma

    for score, key_name in key_scores(filtered.mean(axis=1), np)[:6]:
        votes[key_name] = votes.get(key_name, 0.0) + max(0.0, float(score)) * weight * 4.0

    segment_count = min(8, max(1, filtered.shape[1] // 130))
    for segment in np.array_split(filtered, segment_count, axis=1):
        if segment.shape[1] < 8:
            continue
        for score, key_name in key_scores(segment.mean(axis=1), np)[:3]:
            votes[key_name] = votes.get(key_name, 0.0) + max(0.0, float(score)) * weight * 0.95

    return segment_count


def detect_key_from_audio(y, sr, librosa, np):
    harmonic = librosa.effects.harmonic(y)
    if float(np.max(np.abs(harmonic))) < 1e-5:
        harmonic = y

    feature_specs = [
        ("stft_full", y, 1.55),
        ("cqt_full", y, 1.0),
        ("cens_full", y, 0.85),
        ("stft_harmonic", harmonic, 1.15),
        ("cqt_harmonic", harmonic, 0.75),
        ("cens_harmonic", harmonic, 0.65),
    ]
    votes = {}
    segment_total = 0
    feature_count = 0

    for label, signal, weight in feature_specs:
        try:
            if label.startswith("stft"):
                chroma = librosa.feature.chroma_stft(y=signal, sr=sr)
            elif label.startswith("cqt"):
                chroma = librosa.feature.chroma_cqt(y=signal, sr=sr)
            else:
                chroma = librosa.feature.chroma_cens(y=signal, sr=sr)

            segment_total += add_key_votes_from_chroma(chroma, np, votes, weight)
            feature_count += 1
        except Exception:
            pass

    if not votes:
        return None, 0

    sorted_votes = sorted(votes.items(), key=lambda item: item[1], reverse=True)
    best = sorted_votes[0]
    second = sorted_votes[1] if len(sorted_votes) > 1 else ("", 0.0)
    spread = (best[1] - second[1]) / (best[1] + 1e-9)
    confidence = int(
        max(
            20,
            min(90, 38 + spread * 80 + min(segment_total, 18) * 0.55 + feature_count * 2.0),
        )
    )
    return best[0], confidence


def analyze(audio_path):
    import librosa
    import numpy as np

    y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=180)
    if y.size == 0:
        return {
            "bpm": None,
            "bpmConfidence": 0,
            "key": None,
            "keyConfidence": 0,
            "error": "오디오 샘플이 비어 있습니다.",
        }

    with ThreadPoolExecutor(max_workers=2) as executor:
        bpm_future = executor.submit(estimate_bpm, y, sr, librosa, np)
        key_future = executor.submit(detect_key_from_audio, y, sr, librosa, np)
        bpm, bpm_confidence, bpm_alternatives = bpm_future.result()
        key, key_confidence = key_future.result()

    return {
        "bpm": bpm,
        "bpmConfidence": bpm_confidence if bpm else 0,
        "bpmAlternatives": bpm_alternatives,
        "key": key,
        "keyConfidence": key_confidence,
    }


def main():
    if len(sys.argv) != 2:
        print(
            json.dumps(
                {
                    "bpm": None,
                    "bpmConfidence": 0,
                    "key": None,
                    "keyConfidence": 0,
                    "error": "audio path argument is required",
                },
                ensure_ascii=False,
            )
        )
        return

    try:
        print(json.dumps(analyze(sys.argv[1]), ensure_ascii=False))
    except Exception:
        print(
            json.dumps(
                {
                    "bpm": None,
                    "bpmConfidence": 0,
                    "key": None,
                    "keyConfidence": 0,
                    "error": "오디오 분석을 완료하지 못했습니다.",
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
