export const ko = {
  languageName: "한국어",
  header: {
    navLabel: "주요 내비게이션",
    howItWorks: "작동 방식",
    accuracy: "정확도",
    legal: "법적 안내",
    status: "권리 확인 기반",
    languageLabel: "언어 선택"
  },
  hero: {
    eyebrow: "YouTube type beat 분석",
    title: "유튜브 타입 비트의 BPM, Key, 추출 오디오까지",
    description:
      "링크를 붙여넣으면 설명, 댓글, 오디오를 함께 분석해 BPM, Key, 변환 파일을 제공합니다.",
    textSignals: "메타데이터와 댓글 분석",
    audioSignals: "오디오 BPM과 estimated key"
  },
  form: {
    title: "YouTube type beat 분석",
    subtitle: "공개 YouTube 링크와 권리 확인이 필요합니다.",
    urlLabel: "YouTube URL",
    urlPlaceholder: "YouTube type beat URL을 붙여넣으세요",
    clearUrl: "URL 지우기",
    urlHelp: "youtube.com watch, youtu.be, youtube shorts URL을 지원합니다.",
    formatLabel: "출력 포맷",
    qualityLabel: "오디오 품질",
    rights: "이 영상을 다운로드·변환·분석할 권리가 있음을 확인합니다.",
    submit: "분석 및 변환 시작"
  },
  progress: {
    steps: [
      "영상 정보 확인 중",
      "설명/댓글 분석 중",
      "오디오 추출 중",
      "BPM/Key 분석 중",
      "파일 변환 중"
    ]
  },
  empty: {
    workflowTitle: "텍스트 신호 우선",
    workflowBody: "제목, 설명, 댓글에서 BPM과 Key 후보를 먼저 찾습니다.",
    accuracyTitle: "confidence 기반 추천",
    accuracyBody: "출처와 반복 빈도를 반영해 추천값과 근거를 분리합니다.",
    legalTitle: "권리 있는 콘텐츠만",
    legalBody: "보호 우회, 로그인 쿠키, 비공개 영상 접근은 지원하지 않습니다."
  },
  error: {
    title: "분석을 시작하지 못했습니다",
    network:
      "분석 요청을 처리하는 동안 문제가 발생했습니다. 잠시 후 다시 시도하세요."
  },
  result: {
    commentsSummary: (count: number, duration: number) =>
      `댓글 ${count}개 반영 · 영상 길이 ${duration}s`,
    limitedApiKey: {
      summary: "오디오 분석 진행 · 설명/댓글 보조 분석 제한",
      title: "YouTube API 키 없이 오디오 분석을 진행합니다",
      body:
        "API 키가 없으면 설명과 댓글 기반 보조 분석은 제한되지만, 오디오 BPM/Key 측정과 변환 파일 다운로드는 계속 진행합니다.",
      steps: [
        ".env.example을 .env로 복사합니다.",
        ".env 파일에 YOUTUBE_API_KEY=발급받은_키 를 입력합니다.",
        "개발 서버를 다시 실행합니다. 예: pnpm dev"
      ],
      note:
        "API 키는 비트메이커 설명과 댓글을 보조 근거로 더 잘 반영하고 싶을 때 설정하면 됩니다."
    },
    recommendedBpm: "추천 BPM",
    recommendedKey: "추천 Key",
    alternativeBpmLabel: "다른 후보",
    textBasis: "영상 설명/댓글 기준",
    audioBasis: "오디오 분석 기준",
    confidence: (value: number) => `${value}% confidence`,
    download: "변환된 오디오 다운로드",
    noDownload: "오디오 파일은 생성되지 않았지만 가능한 분석 결과는 표시했습니다.",
    evidenceTitle: "분석 근거",
    evidenceEmpty: "제목, 설명, 댓글에서 명확한 BPM/Key 구절을 찾지 못했습니다.",
    logsTitle: "분석 로그 보기",
    camelot: "Camelot",
    camelotUnavailable: "Camelot 정보 없음",
    tempoRange: (low: number, high: number) =>
      low === high ? `${low} BPM 근처` : `${low}-${high} BPM 근처`,
    useHintTitle: "활용 힌트",
    useHints: ["녹음 키 확인", "리믹스 기준점", "비트 매칭 참고"],
    sourceLabels: {
      title: "제목",
      description: "설명",
      comment: "댓글"
    },
    recommendationReasons: {
      noBpm: "명확한 BPM 후보를 찾지 못했습니다.",
      noKey: "명확한 Key 후보를 찾지 못했습니다.",
      textConfidence: (confidence: number) => `텍스트 confidence ${confidence}%`,
      audioConfidence: (confidence: number) => `오디오 분석 confidence ${confidence}%`
    },
    warningMessages: {
      COMMENT_UNAVAILABLE:
        "댓글을 가져올 수 없지만, 제목과 설명을 기준으로 분석을 계속합니다.",
      DURATION_EXCEEDED:
        "이 영상은 길이 제한을 초과해 오디오 처리를 건너뛰었습니다.",
      AUDIO_ANALYSIS_FAILED:
        "오디오 분석은 실패했지만 변환 파일과 텍스트 기반 결과를 표시합니다.",
      AUDIO_PROCESS_FAILED:
        "오디오 처리를 완료하지 못했지만 텍스트 기반 분석 결과를 표시합니다.",
      AUDIO_QUEUE_BUSY:
        "현재 오디오 작업이 많아 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      AUDIO_TOOL_UNAVAILABLE:
        "오디오 도구를 실행할 수 없습니다. 로컬 설치 또는 Docker 환경을 확인해 주세요.",
      MISSING_YOUTUBE_API_KEY:
        "YOUTUBE_API_KEY가 없어 설명/댓글 기반 보조 분석은 제한됩니다. 오디오 BPM/Key 분석과 다운로드는 계속 진행합니다."
    }
  },
  server: {
    commentWarning:
      "댓글을 가져올 수 없지만, 제목과 설명을 기준으로 분석을 계속합니다.",
    warnings: {
      durationExceeded:
        "이 영상은 길이 제한을 초과해 오디오 처리를 건너뛰었습니다.",
      audioAnalysisFailed:
        "오디오 분석은 실패했지만 변환 파일과 텍스트 기반 결과를 표시합니다.",
      audioProcessingFailed:
        "오디오 처리를 완료하지 못했지만 텍스트 기반 분석 결과를 표시합니다.",
      apiKeyMissingLimited:
        "YOUTUBE_API_KEY가 없어 설명/댓글 기반 보조 분석은 제한됩니다. 오디오 BPM/Key 분석과 다운로드는 계속 진행합니다."
    },
    logs: {
      videoConfirmed: (videoId: string) => `videoId ${videoId} 확인`,
      textExtracted: (count: number) =>
        `제목/설명과 댓글 ${count}개에서 BPM/Key 후보 추출`,
      bpmConfidence: (confidence: number) =>
        `텍스트 BPM confidence ${confidence}%`,
      keyConfidence: (confidence: number) =>
        `텍스트 Key confidence ${confidence}%`,
      commentsFailed: "댓글 수집 실패: 제목과 설명만으로 텍스트 분석 진행",
      durationSkipped: "영상 길이 제한 초과로 오디오 처리 생략",
      audioDone: "오디오 추출 및 변환 완료",
      audioAnalysisFailed: "오디오 BPM/Key 분석 실패: 텍스트 기반 결과 유지",
      audioResult: (bpm: string, key: string) => `오디오 분석 BPM ${bpm}, Key ${key}`,
      audioFailed: (code: string) => `오디오 처리 실패: ${code}`,
      apiKeyMissingLimited:
        "YouTube Data API 키 없음: 설명/댓글 보조 분석 제한, 오디오 분석 계속"
    },
    recommendation: {
      noBpm: "명확한 BPM 후보를 찾지 못했습니다.",
      noKey: "명확한 Key 후보를 찾지 못했습니다.",
      textConfidence: (confidence: number) => `텍스트 confidence ${confidence}%`,
      audioConfidence: (confidence: number) =>
        `오디오 분석 confidence ${confidence}%`,
      closeBpm: "두 BPM 후보가 ±2 이내로 근접합니다.",
      halfDoubleBpm:
        "오디오 템포가 비트메이커 표기의 하프타임/더블타임 후보와 일치합니다.",
      highTextBpm: "제목/설명 기반 BPM 신뢰도가 높아 비트메이커 표기값을 우선했습니다.",
      weakTextBpm:
        "텍스트 후보와 오디오 측정값이 달라 오디오 값을 우선했습니다.",
      matchedKey: "텍스트와 오디오 Key 후보가 일치해 오디오 값을 추천합니다.",
      highTextKey: "제목/설명 기반 Key 신뢰도가 높아 비트메이커 표기값을 우선했습니다.",
      weakTextKey: "텍스트 후보가 약해 오디오 estimated key를 우선했습니다."
    },
    errors: {
      INVALID_REQUEST: "요청 형식이 올바르지 않습니다.",
      URL_REQUIRED: "YouTube 링크를 입력해 주세요.",
      RIGHTS_REQUIRED:
        "분석을 시작하려면 다운로드·변환·분석 권리 확인이 필요합니다.",
      INVALID_FORMAT: "지원하지 않는 오디오 포맷입니다.",
      INVALID_QUALITY: "선택한 포맷에 맞지 않는 품질 옵션입니다.",
      INVALID_URL: "올바른 URL 형식이 아닙니다.",
      INVALID_YOUTUBE_URL: "유효한 YouTube 영상 ID를 찾을 수 없습니다.",
      NOT_YOUTUBE_URL: "YouTube 링크만 분석할 수 있습니다.",
      MISSING_YOUTUBE_API_KEY:
        "YOUTUBE_API_KEY가 설정되어 있지 않습니다. 환경변수를 추가한 뒤 다시 실행해 주세요.",
      YOUTUBE_API_ERROR:
        "YouTube API에서 정보를 가져오지 못했습니다. API 키와 할당량을 확인해 주세요.",
      VIDEO_NOT_FOUND: "해당 YouTube 영상을 찾을 수 없습니다.",
      AUDIO_TOOL_UNAVAILABLE:
        "오디오 도구를 실행할 수 없습니다. 로컬 설치 또는 Docker 환경을 확인해 주세요.",
      AUDIO_PROCESS_FAILED:
        "오디오 처리에 실패했습니다. 공개 영상인지, 권한과 서버 도구 설치 상태를 확인해 주세요.",
      AUDIO_SOURCE_MISSING: "오디오 원본 파일을 생성하지 못했습니다.",
      AUDIO_QUEUE_BUSY:
        "현재 오디오 작업이 많아 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      INTERNAL_ERROR: "서버에서 분석을 처리하는 동안 문제가 발생했습니다."
    }
  }
};
