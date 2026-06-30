# neptune

neptune은 사용자가 권리를 가진 YouTube type beat 링크를 입력하면 제목, 설명, 댓글, 허용된 오디오 처리를 함께 참고해 BPM과 Key를 추정하고 변환 오디오 파일을 제공하는 Next.js 기반 음악 분석 웹앱입니다.

## 권장 배포 구조

현재 neptune은 오디오 추출, `ffmpeg` 변환, Python worker 기반 BPM/Key 분석, `yt-dlp` 처리가 필요합니다. 이 작업은 서버 실행 시간과 시스템 의존성이 필요하므로 Vercel 단독 배포보다 Docker 기반 단일 서버 배포가 적합합니다.

권장 방식:

- Next.js 앱과 API Route를 하나의 Docker 컨테이너에서 실행
- 같은 컨테이너 안에 `ffmpeg`, Python, `worker/requirements.txt`, `yt-dlp` 설치
- Render, Railway, Fly.io, DigitalOcean, VPS처럼 Docker 실행이 가능한 환경에 배포
- 프론트엔드/백엔드 분리 배포는 나중에 트래픽이 커질 때 검토

Vercel 단독 배포는 권장하지 않습니다. 서버리스 제한 시간, 임시 파일 보존, Python/ffmpeg/yt-dlp 실행 제약 때문에 오디오 변환과 분석 기능이 불안정할 수 있습니다.

## 프로젝트 구조

- `app/`: Next.js App Router 화면과 API Route Handler
- `app/api/analyze/route.ts`: YouTube URL 분석, 텍스트 분석, 오디오 작업 요청
- `app/api/download/route.ts`: `fileId` 기반 다운로드 응답과 `Content-Disposition` 파일명 처리
- `app/api/health/route.ts`: 배포 플랫폼용 health check
- `components/`: NeptuneLogo, 입력 폼, 진행 상태, 결과 UI
- `lib/youtube.ts`: YouTube Data API와 oEmbed/yt-dlp fallback 메타데이터 로직
- `lib/textExtraction.ts`: 제목, 설명, 댓글의 BPM/Key 후보 추출
- `lib/confidence.ts`: 텍스트/오디오 후보 confidence와 추천값 계산
- `lib/audioJob.ts`: `yt-dlp`, `ffmpeg`, Python worker 실행, 임시 파일과 다운로드 관리
- `lib/fileCleanup.ts`: `TEMP_DIR` 내부 임시 파일 정리
- `lib/downloadFilename.ts`: 다운로드 표시 파일명 생성과 header 인코딩
- `lib/runtimeConfig.ts`: production 환경변수 읽기
- `lib/logger.ts`: 운영 로그 출력
- `lib/messages/ko.ts`, `lib/messages/en.ts`: 한국어/영어 UI 문구
- `worker/analyze_audio.py`: librosa 기반 BPM/Key 분석 worker
- `worker/requirements.txt`: Python worker 의존성
- `Dockerfile`, `docker-compose.yml`: Docker 기반 배포 설정
- `tests/`: URL 파싱, 텍스트 추출, confidence, 파일명 테스트

자주 수정할 파일:

- UI 문구: `lib/messages/ko.ts`, `lib/messages/en.ts`
- 로고: `components/NeptuneLogo.tsx`, `app/icon.svg`
- BPM/Key 분석 로직: `worker/analyze_audio.py`
- 텍스트 기반 BPM/Key 추출: `lib/textExtraction.ts`
- 추천값 계산: `lib/confidence.ts`
- YouTube API 로직: `lib/youtube.ts`
- 오디오 변환/다운로드 작업: `lib/audioJob.ts`
- 다운로드 파일명: `lib/downloadFilename.ts`
- 환경변수: `.env`
- 배포 설정: `Dockerfile`, `docker-compose.yml`

## 환경변수

`.env.example`을 참고해 `.env`를 만듭니다.

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
YOUTUBE_API_KEY=
MAX_VIDEO_DURATION_SECONDS=600
TEMP_FILE_TTL_MINUTES=30
TEMP_DIR=/tmp/neptune
MAX_CONCURRENT_JOBS=2
JOB_TIMEOUT_SECONDS=900
DOWNLOAD_BASE_URL=
LOG_LEVEL=info
AUDIO_ANALYSIS_SAMPLE_SECONDS=180
```

환경변수 설명:

- `NODE_ENV`: production 배포에서는 `production`
- `NEXT_PUBLIC_APP_URL`: 공개 앱 주소. 커스텀 도메인을 연결하면 `https://your-domain.com`
- `YOUTUBE_API_KEY`: YouTube Data API v3 서버용 API key. 클라이언트에 노출하지 않습니다.
- `MAX_VIDEO_DURATION_SECONDS`: 처리 가능한 최대 영상 길이. 기본 600초
- `TEMP_FILE_TTL_MINUTES`: 변환 파일과 작업 디렉터리 보관 시간. 기본 30분
- `TEMP_DIR`: 임시 파일 저장 위치. Docker에서는 `/tmp/neptune` 권장
- `MAX_CONCURRENT_JOBS`: 동시에 처리할 오디오 작업 수. 기본 2
- `JOB_TIMEOUT_SECONDS`: `yt-dlp`, `ffmpeg`, Python worker 개별 작업 timeout. 기본 900초
- `DOWNLOAD_BASE_URL`: 다운로드 URL을 절대 URL로 만들 때 사용. 비워 두면 상대 URL 사용
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error`, `silent`
- `AUDIO_ANALYSIS_SAMPLE_SECONDS`: 분석 샘플 길이. 기본 180초

환경변수 변경 후에는 서버를 재시작해야 합니다. Docker 배포에서는 컨테이너를 재시작하거나 재배포해야 적용됩니다.

`NEXT_PUBLIC_` prefix가 붙은 값은 브라우저 번들에 포함될 수 있습니다. API key, token, secret은 절대 `NEXT_PUBLIC_` 변수에 넣지 마세요.

## YouTube API Key 설정

1. Google Cloud Console에서 프로젝트를 만듭니다.
2. YouTube Data API v3를 활성화합니다.
3. API Key를 발급합니다.
4. `.env`에 `YOUTUBE_API_KEY=발급받은_키`를 추가합니다.
5. 서버를 재시작합니다.

키가 없어도 neptune은 오디오 기반 BPM/Key 분석과 다운로드를 시도합니다. 다만 제목/썸네일 중심의 제한 결과가 표시될 수 있고, 설명/댓글 기반 보조 분석은 제한됩니다.

## 로컬 개발 실행

```bash
pnpm install
py -m pip install -r worker/requirements.txt
pnpm dev:neptune
```

접속:

```text
http://localhost:3000
```

개발 서버 캐시 문제가 생기면:

```bash
pnpm dev:clean
```

## Production Build

```bash
pnpm test
pnpm build
pnpm start
```

`pnpm build`는 배포 전에 반드시 확인합니다. 개발 서버가 켜진 상태에서 빌드를 반복하면 `.next` 캐시가 꼬일 수 있으므로, 이상한 Runtime Error가 보이면 서버를 끄고 `pnpm dev:clean` 또는 `pnpm clean`을 실행하세요.

## GitHub 업로드

GitHub에는 소스 코드와 설정 파일만 올립니다. 다음 항목은 업로드하지 않습니다.

- `node_modules/`
- `.next/`
- `tmp/`
- `.env`
- 개발 서버 로그
- 테스트로 생성된 오디오/비디오 파일

이 항목들은 `.gitignore`에 등록되어 있습니다. 현재 폴더는 GitHub 업로드용으로 정리되어 있으며, 다시 로컬에서 실행하려면 의존성을 한 번 설치하면 됩니다.

```bash
pnpm install
py -m pip install -r worker/requirements.txt
pnpm dev:neptune
```

Git이 설치되어 있다면 일반적인 업로드 순서는 다음과 같습니다.

```bash
git init
git add .
git commit -m "Initial neptune project"
git branch -M main
git remote add origin https://github.com/YOUR_ID/neptune.git
git push -u origin main
```

`.env`는 GitHub에 올리지 말고, 배포 서비스의 Environment Variables 메뉴에 따로 입력하세요.

## Docker 실행

Docker 이미지는 Next.js production 서버, `ffmpeg`, Python, `yt-dlp`, worker 의존성을 함께 포함합니다.

이미지 빌드:

```bash
docker build -t neptune .
```

컨테이너 실행:

```bash
docker run --rm -p 3000:3000 --env-file .env -v neptune_tmp:/tmp/neptune neptune
```

접속:

```text
http://localhost:3000
```

## docker compose 실행

```bash
docker compose up --build
```

백그라운드 실행:

```bash
docker compose up -d --build
```

로그 확인:

```bash
docker compose logs -f neptune
```

재시작:

```bash
docker compose restart neptune
```

중지:

```bash
docker compose down
```

임시 파일 volume까지 지우려면:

```bash
docker compose down -v
```

## Health Check

기본 health check:

```bash
curl http://localhost:3000/api/health
```

응답 예:

```json
{
  "status": "ok",
  "service": "neptune"
}
```

도구 설치 상태까지 확인:

```bash
curl http://localhost:3000/api/health?tools=1
```

응답 예:

```json
{
  "status": "ok",
  "service": "neptune",
  "checks": {
    "ffmpeg": "ok",
    "python": "ok",
    "ytDlp": "ok"
  }
}
```

API key, 내부 파일 경로, 서버 설정값은 health 응답에 포함하지 않습니다.

## 임시 파일 관리

neptune은 오디오 원본, 분석 샘플, 변환 결과를 `TEMP_DIR` 안에만 저장합니다. 다운로드는 서버 내부 경로가 아니라 UUID 기반 `fileId`로만 접근합니다.

정리 방식:

- 분석 요청 시작 시 만료된 다운로드 작업을 정리합니다.
- 서버 실행 중 1분 간격으로 만료된 작업을 정리합니다.
- 서버 시작 후 첫 오디오/다운로드 작업 시 `TEMP_DIR` 안의 오래된 파일을 정리합니다.
- `TEMP_FILE_TTL_MINUTES`가 지난 파일은 삭제 대상입니다.

Docker 기본 위치:

```text
/tmp/neptune
```

디스크 용량이 부족하면:

1. `docker compose logs -f neptune`으로 오류를 확인합니다.
2. `TEMP_FILE_TTL_MINUTES`를 줄입니다.
3. 동시 작업이 많다면 `MAX_CONCURRENT_JOBS`를 낮춥니다.
4. 임시 파일 volume을 비워야 하면 `docker compose down -v`를 사용합니다.

## 운영 로그

`LOG_LEVEL`로 로그 수준을 조정합니다.

- `debug`: 가장 자세한 로그
- `info`: 운영 기본값
- `warn`: 경고 이상
- `error`: 오류만
- `silent`: 로그 비활성화

서버 로그에는 다음 단계가 남습니다.

- metadata fetch 시작/성공/실패
- text analysis 시작/성공
- audio extraction 시작/성공/실패
- audio conversion 시작/성공/실패
- BPM/Key analysis 시작/성공/실패
- temp cleanup 시작/성공/실패

로그에는 API key, token, secret, 내부 파일 경로를 남기지 않도록 처리했습니다.

Docker 로그 확인:

```bash
docker compose logs -f neptune
```

Render/Railway/Fly.io 같은 플랫폼에서는 각 서비스의 Logs 탭에서 같은 서버 로그를 확인합니다.

## 실제 배포 절차

### Render 또는 Railway 같은 Docker 지원 플랫폼

1. GitHub 저장소에 코드를 올립니다.
2. 새 Web Service를 만들고 Dockerfile 기반 배포를 선택합니다.
3. 환경변수를 플랫폼 dashboard에 등록합니다.
4. `YOUTUBE_API_KEY`, `NEXT_PUBLIC_APP_URL`, `TEMP_DIR`, `MAX_CONCURRENT_JOBS`, `JOB_TIMEOUT_SECONDS`를 확인합니다.
5. 배포 후 `/api/health`를 확인합니다.
6. 실제 YouTube URL로 분석, 변환, 다운로드를 테스트합니다.

권장 환경변수 예:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-service.example.com
DOWNLOAD_BASE_URL=https://your-service.example.com
YOUTUBE_API_KEY=your_key
TEMP_DIR=/tmp/neptune
MAX_CONCURRENT_JOBS=2
JOB_TIMEOUT_SECONDS=900
LOG_LEVEL=info
```

### VPS 또는 DigitalOcean에 Docker로 배포

1. 서버에 Docker와 Docker Compose를 설치합니다.
2. 프로젝트를 서버로 복사하거나 Git clone 합니다.
3. `.env`를 작성합니다.
4. `docker compose up -d --build`를 실행합니다.
5. 방화벽에서 80/443 또는 reverse proxy 포트를 엽니다.
6. Nginx/Caddy/Traefik으로 `localhost:3000`에 reverse proxy를 연결합니다.
7. 도메인을 연결하면 `NEXT_PUBLIC_APP_URL`과 `DOWNLOAD_BASE_URL`을 도메인으로 바꾸고 재시작합니다.

### 커스텀 도메인 연결

도메인 연결 후:

```bash
NEXT_PUBLIC_APP_URL=https://neptune.example.com
DOWNLOAD_BASE_URL=https://neptune.example.com
```

환경변수를 바꾼 뒤 서버를 재시작하세요.

## 배포 후 체크리스트

- [ ] `YOUTUBE_API_KEY` 설정 확인
- [ ] `NEXT_PUBLIC_APP_URL` 설정 확인
- [ ] `DOWNLOAD_BASE_URL` 설정 확인 또는 상대 URL 사용 확인
- [ ] `pnpm build` 성공
- [ ] `docker build -t neptune .` 성공
- [ ] `docker compose up --build` 실행 성공
- [ ] `/api/health` 정상 응답
- [ ] `/api/health?tools=1`에서 ffmpeg, python, yt-dlp 확인
- [ ] YouTube URL 분석 정상 작동
- [ ] 긴 영상 제한 정상 작동
- [ ] 오디오 변환 정상 작동
- [ ] 다운로드 파일명 정상 작동
- [ ] 임시 파일 삭제 정상 작동
- [ ] API key가 클라이언트에 노출되지 않는지 확인
- [ ] 서버 로그에 민감한 값이 없는지 확인

## Maintenance

코드 수정 후 로컬 확인 순서:

```bash
pnpm test
pnpm build
pnpm dev:neptune
```

Docker image 다시 빌드:

```bash
docker build -t neptune .
```

docker compose 재배포:

```bash
docker compose up -d --build
```

환경변수 변경 후:

```bash
docker compose restart neptune
```

의존성 업데이트 주의사항:

- `package.json` 또는 `pnpm-lock.yaml`이 바뀌면 `pnpm install` 후 테스트와 빌드를 다시 실행합니다.
- `worker/requirements.txt`가 바뀌면 Docker image를 다시 빌드해야 합니다.
- YouTube 쪽 변경으로 다운로드 실패가 늘어나면 `yt-dlp` 업데이트가 필요할 수 있습니다.
- `yt-dlp`는 `worker/requirements.txt`에 포함되어 있으므로 버전을 올린 뒤 Docker rebuild가 필요합니다.
- BPM/Key 정확도 관련 수정은 `worker/analyze_audio.py`와 관련 테스트/실제 영상 검증을 함께 진행하세요.

## Maintenance Checklist

- [ ] 배포 전 `pnpm test` 확인
- [ ] 배포 전 `pnpm build` 확인
- [ ] Docker build 확인
- [ ] `/api/health` 확인
- [ ] `YOUTUBE_API_KEY` 유효성 확인
- [ ] YouTube API quota 확인
- [ ] ffmpeg 동작 확인
- [ ] Python worker 동작 확인
- [ ] yt-dlp 동작 확인
- [ ] 임시 파일 정리 확인
- [ ] 서버 디스크 용량 확인
- [ ] 에러 로그 확인
- [ ] 환경변수 변경 후 서버 재시작
- [ ] 의존성 업데이트 후 로컬 테스트

## Troubleshooting

### `YOUTUBE_API_KEY`가 없을 때

오디오 BPM/Key 분석과 다운로드는 계속 시도하지만, 설명/댓글 기반 보조 분석은 제한됩니다. Google Cloud Console에서 YouTube Data API v3 key를 발급해 `.env` 또는 배포 플랫폼 환경변수에 설정하고 서버를 재시작하세요.

### YouTube API quota가 부족할 때

YouTube API가 403 또는 quota 오류를 반환할 수 있습니다. Google Cloud Console에서 quota 사용량을 확인하고, 필요한 경우 quota 증설을 요청하거나 다음 날 quota reset 이후 다시 시도하세요.

### ffmpeg를 찾지 못할 때

Docker 배포에서는 Dockerfile이 `ffmpeg`를 설치합니다. 로컬 실행에서는 `@ffmpeg-installer/ffmpeg`를 기본 사용합니다. 직접 설치한 ffmpeg를 쓰려면 `FFMPEG_BIN`을 설정하세요.

### Python worker가 실행되지 않을 때

로컬에서는 다음을 실행합니다.

```bash
py -m pip install -r worker/requirements.txt
```

Docker에서는 image를 다시 빌드합니다.

```bash
docker compose up -d --build
```

### yt-dlp가 실패할 때

일부 영상은 YouTube 정책, 지역 제한, 포맷, 임시 차단 때문에 실패할 수 있습니다. `yt-dlp` 버전을 올린 뒤 Docker image를 다시 빌드하세요. 비공개 영상, 로그인 필요한 영상, DRM 우회는 지원하지 않습니다.

### 영상 길이가 제한을 초과할 때

`MAX_VIDEO_DURATION_SECONDS`보다 긴 영상은 처리하지 않습니다. 서버 비용과 timeout을 고려해 값을 조정하되, 너무 크게 올리면 변환 시간이 길어지고 디스크 사용량이 증가합니다.

### 다운로드 파일이 만료되었을 때

다운로드 파일은 `TEMP_FILE_TTL_MINUTES` 이후 삭제됩니다. 다시 분석하면 새 다운로드 링크가 생성됩니다.

### 서버 디스크 용량이 부족할 때

`TEMP_DIR` 또는 Docker volume을 확인합니다. `TEMP_FILE_TTL_MINUTES`와 `MAX_CONCURRENT_JOBS`를 낮추고, 필요하면 `docker compose down -v`로 volume을 비웁니다.

### `npm run build` 또는 `pnpm build`가 실패할 때

의존성을 다시 설치하고 테스트를 먼저 확인합니다.

```bash
pnpm install
pnpm test
pnpm build
```

개발 서버가 켜져 있던 상태라면 끄고 `pnpm clean` 후 다시 시도하세요.

### Docker build가 실패할 때

네트워크, apt package mirror, Python 패키지 설치, lockfile 상태를 확인합니다.

```bash
docker build --no-cache -t neptune .
```

`worker/requirements.txt` 또는 `pnpm-lock.yaml`을 바꿨다면 반드시 다시 빌드하세요.

### `/api/health`가 실패할 때

컨테이너가 실행 중인지 확인합니다.

```bash
docker compose ps
docker compose logs -f neptune
```

포트가 막혀 있거나 reverse proxy 설정이 잘못된 경우도 확인하세요.

## 분석 정확도의 한계

- 오디오 분석값을 주 결과로 사용하고, 제목/설명에 명확히 적힌 BPM/Key는 높은 우선순위의 검증 근거로 반영합니다.
- 댓글 기반 정보는 참고하되 제목/설명보다 낮은 우선순위입니다.
- 오디오 Key 분석은 chroma feature 기반 estimated key입니다. 완벽한 조성 판정을 보장하지 않습니다.
- BPM은 하프타임/더블타임으로 감지될 수 있어 후보값을 함께 고려합니다.
- 분석 정확도를 위해 기본 분석 샘플 길이는 180초입니다. 낮추면 빨라지지만 정확도가 떨어질 수 있습니다.

## 법적 주의사항

neptune은 사용자가 다운로드, 변환, 분석할 권리가 있는 콘텐츠만 처리하도록 설계되었습니다. 보호된 콘텐츠 우회, DRM 우회, 로그인 쿠키 사용, 비공개 영상 접근, 지역 제한 우회, YouTube 보안 제한 우회 기능은 구현하지 않습니다. YouTube API, `yt-dlp`, `ffmpeg`, Python 라이브러리의 약관과 라이선스를 지켜야 합니다.
