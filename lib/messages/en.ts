import type { ko } from "./ko";

export const en = {
  languageName: "English",
  header: {
    navLabel: "Primary navigation",
    howItWorks: "How it works",
    accuracy: "Accuracy",
    legal: "Legal",
    status: "Rights-gated",
    languageLabel: "Language"
  },
  hero: {
    eyebrow: "YouTube type beat analysis",
    title: "YouTube type beat BPM, Key, and extracted audio",
    description:
      "Paste a link and neptune analyzes the description, comments, and authorized audio to return BPM, Key, and a converted file.",
    textSignals: "Metadata and comment extraction",
    audioSignals: "Audio BPM and estimated key"
  },
  form: {
    title: "Analyze a YouTube type beat",
    subtitle: "A public YouTube link and rights confirmation are required.",
    urlLabel: "YouTube URL",
    urlPlaceholder: "Paste a YouTube type beat URL",
    clearUrl: "Clear URL",
    urlHelp: "youtube.com watch, youtu.be, and YouTube Shorts URLs are supported.",
    formatLabel: "Output format",
    qualityLabel: "Audio quality",
    rights: "I confirm that I have the right to download,\nconvert, and analyze this video.",
    submit: "Analyze and convert"
  },
  progress: {
    steps: [
      "Checking video info",
      "Analyzing description/comments",
      "Extracting audio",
      "Analyzing BPM/Key",
      "Converting file"
    ]
  },
  empty: {
    workflowTitle: "Text signals first",
    workflowBody: "neptune first looks for BPM and Key candidates in the title, description, and comments.",
    accuracyTitle: "Confidence-aware",
    accuracyBody: "Source weight and repeated matches are separated from the final recommendation.",
    legalTitle: "Authorized content only",
    legalBody: "Protected-content bypass, login cookies, and private video access are not supported."
  },
  error: {
    title: "Analysis could not start",
    network: "Something went wrong while sending the analysis request. Please try again."
  },
  result: {
    commentsSummary: (count: number, duration: number) =>
      `${count} comments included · ${duration}s video`,
    limitedApiKey: {
      summary: "Audio analysis running · description/comment signals limited",
      title: "Audio analysis runs without a YouTube API key",
      body:
        "Without an API key, description and comment signals are limited, but audio BPM/Key detection and converted-file downloads still continue.",
      steps: [
        "Copy .env.example to .env.",
        "Add YOUTUBE_API_KEY=your_key to the .env file.",
        "Restart the development server. Example: pnpm dev"
      ],
      note:
        "Add an API key only when you want stronger producer-description and comment evidence."
    },
    recommendedBpm: "Recommended BPM",
    recommendedKey: "Recommended Key",
    alternativeBpmLabel: "Other candidates",
    textBasis: "Title/description/comment basis",
    audioBasis: "Audio analysis basis",
    confidence: (value: number) => `${value}% confidence`,
    download: "Download converted audio",
    noDownload: "No audio file was generated, but available analysis results are shown.",
    evidenceTitle: "Analysis evidence",
    evidenceEmpty: "No clear BPM/Key phrase was found in the title, description, or comments.",
    logsTitle: "View analysis log",
    camelot: "Camelot",
    camelotUnavailable: "Camelot unavailable",
    tempoRange: (low: number, high: number) =>
      low === high ? `Around ${low} BPM` : `Around ${low}-${high} BPM`,
    useHintTitle: "Use hints",
    useHints: ["For recording", "For remixing", "For beat matching"],
    sourceLabels: {
      title: "title",
      description: "description",
      comment: "comment"
    },
    recommendationReasons: {
      noBpm: "No clear BPM candidate was found.",
      noKey: "No clear Key candidate was found.",
      textConfidence: (confidence: number) => `Text confidence ${confidence}%`,
      audioConfidence: (confidence: number) => `Audio confidence ${confidence}%`
    },
    warningMessages: {
      COMMENT_UNAVAILABLE:
        "Comments are unavailable, but analysis will continue using the title and description.",
      DURATION_EXCEEDED:
        "This video exceeds the maximum duration limit, so audio processing was skipped.",
      AUDIO_ANALYSIS_FAILED:
        "Audio analysis failed, but the converted file and text-based results are shown.",
      AUDIO_EXTRACTION_FAILED:
        "Audio extraction failed, so only title, description, and comment results are shown.",
      AUDIO_ANALYSIS_SAMPLE_FAILED:
        "The analysis audio sample could not be created, so only title, description, and comment results are shown.",
      AUDIO_CONVERSION_FAILED:
        "Audio conversion failed, so no download file was generated. Available text-based results are shown.",
      AUDIO_WORKER_FAILED:
        "The audio BPM/Key analysis environment needs attention. The converted file and text-based results are shown.",
      AUDIO_WORKER_PARSE_FAILED:
        "The audio analysis result could not be parsed. The converted file and text-based results are shown.",
      AUDIO_METADATA_FAILED:
        "Video information for audio processing could not be checked, so only text-based results are shown.",
      AUDIO_PROCESS_FAILED:
        "Audio processing could not be completed, but text-based results are shown.",
      AUDIO_QUEUE_BUSY:
        "Audio jobs are busy right now. Please try again in a moment.",
      AUDIO_TOOL_UNAVAILABLE:
        "Audio tools are unavailable. Check the local installation or Docker environment.",
      JOB_TIMEOUT:
        "Audio processing timed out. Try a shorter video or check the server timeout setting.",
      AUDIO_SOURCE_MISSING:
        "The source audio file could not be generated, so only text-based results are shown.",
      MISSING_YOUTUBE_API_KEY:
        "YOUTUBE_API_KEY is missing, so description/comment signals are limited. Audio BPM/Key analysis and download will continue."
    }
  },
  server: {
    commentWarning:
      "Comments are unavailable, but analysis will continue using the title and description.",
    warnings: {
      durationExceeded:
        "This video exceeds the maximum duration limit, so audio processing was skipped.",
      audioAnalysisFailed:
        "Audio analysis failed, but the converted file and text-based results are shown.",
      audioProcessingFailed:
        "Audio processing could not be completed, but text-based results are shown.",
      apiKeyMissingLimited:
        "YOUTUBE_API_KEY is missing, so description/comment signals are limited. Audio BPM/Key analysis and download will continue."
    },
    logs: {
      videoConfirmed: (videoId: string) => `Confirmed videoId ${videoId}`,
      textExtracted: (count: number) =>
        `Extracted BPM/Key candidates from title/description and ${count} comments`,
      bpmConfidence: (confidence: number) => `Text BPM confidence ${confidence}%`,
      keyConfidence: (confidence: number) => `Text Key confidence ${confidence}%`,
      commentsFailed: "Comment fetch failed: continuing with title and description",
      durationSkipped: "Skipped audio processing because the video exceeds the duration limit",
      audioDone: "Audio extraction and conversion completed",
      audioAnalysisFailed: "Audio BPM/Key analysis failed: keeping text-based result",
      audioResult: (bpm: string, key: string) => `Audio analysis BPM ${bpm}, Key ${key}`,
      audioFailed: (code: string) => `Audio processing failed: ${code}`,
      apiKeyMissingLimited:
        "YouTube Data API key missing: limiting description/comment signals and continuing audio analysis"
    },
    recommendation: {
      noBpm: "No clear BPM candidate was found.",
      noKey: "No clear Key candidate was found.",
      textConfidence: (confidence: number) => `Text confidence ${confidence}%`,
      audioConfidence: (confidence: number) => `Audio confidence ${confidence}%`,
      closeBpm: "The text and audio BPM candidates are within ±2 BPM.",
      halfDoubleBpm:
        "The measured audio tempo matches the producer BPM as a half-time or double-time value.",
      highTextBpm: "The title/description BPM confidence is high, so the producer-stated value was preferred.",
      weakTextBpm:
        "Audio BPM was preferred because text candidates differ from the measured audio.",
      matchedKey: "Text and audio Key candidates match, so the audio estimate is recommended.",
      highTextKey: "The title/description Key confidence is high, so the producer-stated value was preferred.",
      weakTextKey: "Audio estimated key was preferred because text confidence is low."
    },
    errors: {
      INVALID_REQUEST: "The request format is invalid.",
      URL_REQUIRED: "Please enter a YouTube link.",
      RIGHTS_REQUIRED:
        "Rights confirmation is required before analysis can start.",
      INVALID_FORMAT: "This audio format is not supported.",
      INVALID_QUALITY: "This quality option does not match the selected format.",
      INVALID_URL: "This is not a valid URL.",
      INVALID_YOUTUBE_URL: "A valid YouTube video ID could not be found.",
      NOT_YOUTUBE_URL: "Only YouTube links can be analyzed.",
      MISSING_YOUTUBE_API_KEY:
        "YOUTUBE_API_KEY is not configured. Add the environment variable and try again.",
      YOUTUBE_API_ERROR:
        "Could not fetch data from the YouTube API. Check the API key and quota.",
      VIDEO_NOT_FOUND: "This YouTube video could not be found.",
      AUDIO_TOOL_UNAVAILABLE:
        "Audio tools could not be executed. Check the local installation or Docker environment.",
      AUDIO_EXTRACTION_FAILED:
        "YouTube audio could not be extracted. Check whether the video is public, YouTube access is limited, or yt-dlp is configured correctly.",
      AUDIO_ANALYSIS_SAMPLE_FAILED:
        "The analysis audio sample could not be created. Check ffmpeg and the extracted source audio.",
      AUDIO_CONVERSION_FAILED:
        "Audio conversion failed. Check ffmpeg and the selected output format.",
      AUDIO_WORKER_FAILED:
        "The Python audio analysis worker could not run. Check the worker dependencies.",
      AUDIO_WORKER_PARSE_FAILED:
        "The Python worker analysis output could not be parsed.",
      AUDIO_METADATA_FAILED:
        "Video information for audio processing could not be checked.",
      AUDIO_PROCESS_FAILED:
        "Audio processing failed. Check whether the video is public and the server tools are installed.",
      AUDIO_SOURCE_MISSING: "The source audio file could not be generated.",
      AUDIO_QUEUE_BUSY:
        "Audio jobs are busy right now. Please try again in a moment.",
      JOB_TIMEOUT:
        "Audio processing timed out. Please try again in a moment.",
      INTERNAL_ERROR: "The server had a problem while processing the analysis."
    }
  }
} satisfies typeof ko;
