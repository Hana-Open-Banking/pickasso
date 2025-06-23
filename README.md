# Pickasso - 실시간 멀티플레이어 그림 그리기 게임

Pickasso는 Next.js와 TypeScript로 구축된 실시간 멀티플레이어 그림 그리기 게임입니다. 사용자들이 방을 만들어 함께 그림을 그리고 추측하는 재미있는 게임을 즐길 수 있습니다.

## 🎮 주요 기능

### 실시간 멀티플레이어 게임
- **방 생성 및 참여**: 고유한 방 ID로 게임방을 만들고 참여할 수 있습니다
- **실시간 동기화**: Server-Sent Events를 사용한 실시간 그림 동기화
- **다중 플레이어 지원**: 여러 명이 동시에 게임에 참여 가능

### 그림 그리기 기능
- **캔버스 그리기**: 마우스와 터치를 지원하는 직관적인 그리기 인터페이스
- **색상 팔레트**: 다양한 색상 선택 옵션
- **브러시 크기 조절**: 선 굵기를 조절할 수 있는 슬라이더

### 게임 시스템
- **타이머 기능**: 제한 시간 내에 그림을 완성해야 합니다
- **라운드 시스템**: 여러 라운드로 구성된 게임 진행
- **결과 화면**: 게임 종료 후 결과를 확인할 수 있습니다

## 🛠 기술 스택

### 프론트엔드
- **Next.js 14**: React 기반의 풀스택 프레임워크
- **TypeScript**: 타입 안전성을 위한 정적 타입 검사
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Radix UI**: 접근성이 뛰어난 UI 컴포넌트 라이브러리
- **Lucide React**: 아이콘 라이브러리

### 상태 관리
- **Zustand**: 경량화된 상태 관리 라이브러리

### 실시간 통신
- **Server-Sent Events**: 서버에서 클라이언트로의 실시간 데이터 전송

### 개발 도구
- **ESLint**: 코드 품질 관리
- **PostCSS**: CSS 전처리
- **pnpm**: 빠른 패키지 매니저

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- pnpm (권장) 또는 npm

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/Hana-Open-Banking/pickasso.git
   cd pickasso
   ```

2. **의존성 설치**
   ```bash
   pnpm install
   # 또는
   npm install

   # alert 설치
   npm install @radix-ui/react-alert-dialog

   # Gemini
   npm install @google/generative-ai
   ```

3. **개발 서버 실행**
   ```bash
   pnpm dev
   # 또는
   npm run dev
   ```

4. **브라우저에서 확인**
   - [http://localhost:3000](http://localhost:3000)으로 접속

### 빌드 및 배포

```bash
# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

## 📁 프로젝트 구조

```
pickasso/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── drawings/      # 그림 제출 API
│   │   ├── events/        # Server-Sent Events
│   │   ├── games/         # 게임 관련 API
│   │   └── rooms/         # 방 관리 API
│   ├── room/              # 게임방 페이지
│   └── globals.css        # 전역 스타일
├── components/            # React 컴포넌트
│   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   ├── canvas.tsx        # 그림 그리기 캔버스
│   ├── game-screen.tsx   # 게임 화면
│   └── lobby-screen.tsx  # 로비 화면
├── hooks/                # 커스텀 React 훅
├── lib/                  # 유틸리티 및 설정
├── store/                # Zustand 상태 관리
└── utils/                # 유틸리티 함수
```

## 🎯 게임 플레이 방법

1. **방 생성**: 메인 페이지에서 "방 만들기" 버튼을 클릭하여 새 게임방을 생성합니다
2. **방 참여**: 친구에게 방 ID를 공유하거나 직접 방 ID를 입력하여 참여합니다
3. **게임 시작**: 모든 플레이어가 준비되면 게임을 시작합니다
4. **그림 그리기**: 제시어에 맞는 그림을 그립니다
5. **추측하기**: 다른 플레이어들이 그린 그림을 보고 정답을 맞춥니다
6. **결과 확인**: 라운드가 끝나면 결과를 확인하고 다음 라운드로 진행합니다

## 🔧 개발 가이드

### 새로운 기능 추가
1. `components/` 디렉토리에 새 컴포넌트 생성
2. 필요한 경우 `hooks/` 디렉토리에 커스텀 훅 추가
3. API 엔드포인트는 `app/api/` 디렉토리에 추가

### 스타일링
- Tailwind CSS 클래스를 사용하여 스타일링
- 컴포넌트별 스타일은 해당 컴포넌트 파일 내에서 관리
- 전역 스타일은 `app/globals.css`에서 관리

### 상태 관리
- 전역 상태는 `store/` 디렉토리의 Zustand 스토어에서 관리
- 컴포넌트별 상태는 React의 `useState` 훅 사용

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👥 팀

- **개발**: Hana Open Banking Team
- **기술 스택**: Next.js, TypeScript, Tailwind CSS

## 📞 문의

프로젝트에 대한 문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

---

**즐거운 그림 그리기 게임 되세요! 🎨** 
