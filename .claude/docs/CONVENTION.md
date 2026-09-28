# 네이밍 컨벤션

## 코드

- 변수 : camelCase
  - ex) `userName`, `pageIndex`, `isLoading`
- 함수 : camelCase
  - ex) `fetchUser()`, `handleSubmit()`, `formatDate()`
- 클래스 : PascalCase
  - ex) `CustomError`, `UserModel`
- 타입/인터페이스 : PascalCase
  - ex) `GetUserResponse`, `User`, `OrderItem`, `FetchError`
- 컴포넌트 : PascalCase
  - ex) `UserCard`, `OrderList`, `NavigationBar`
- 상수 : UPPER_CASE
  - ex) `BASE_URL`, `MAX_PAGE_SIZE`, `DEFAULT_THEME`

## 파일 관련 컨벤션

- 디렉토리
  - 컴포넌트용 디렉토리 : PascalCase
    - ex) `ui/UserView`, `ui/DescriptionBox`
  - 일반 디렉토리 : camelCase
    - ex) `hooks/useAuth`, `api/userApi`, `utils/date`
  - 라우트 디렉토리(`src/routes`) : 경로명에 따르며, TanStack Router 파일 기반 라우팅 규칙을 따른다
    - ex) `/_guest/signin`, `/_member/mypage`, `/product/$productId`
    - `_xxx` : 경로 없는 레이아웃, `(xxx)` : URL 에 붙지 않는 폴더 묶음, `$xxx` : 경로 파라미터, `-xxx` : 라우트에서 제외 (`-internal`)
- 파일
  - 컴포넌트 : 각 컴포넌트 디렉토리의 index파일에 작성
    - ex) `UserCard/index.tsx`, `OrderList/index.tsx`, `NavigationBar/index.tsx`
    - 단, `src/routes` 안에서 `index.tsx` 는 해당 경로의 index 라우트이므로 컴포넌트 디렉토리는 `-internal` 아래에만 둔다
      - ex) `/_member/mypage/-internal/ui/SubView/index.tsx`
  - 라우트 파일 : TanStack Router 규칙에 따른다
    - ex) `index.tsx`(index 라우트), `route.tsx`(레이아웃 라우트), `signin.tsx`, `__root.tsx`
  - 그 외 : camelCase
    - ex) `formatDate.ts`, `useAuth.ts`, `fetchUser.ts`, `theme.css`

# 타입스크립트 관련 규칙

- **`any` 사용은 금지**합니다.
- 가급적 정확한 타입이 추론되도록 합니다. 추론할 수 없는 경우에는 as를 사용해 최대한 비슷한 타입을 지정합니다.
- eslint 우회하는 주석 사용은 금지합니다.

# 리액트 관련 규칙

- 직접 DOM 조작하는 코드를 작성하지 않습니다.
- react의 렌더링 사이클을 위반하거나 우회하는 방식의 구현은 금지합니다.

# 컴포넌트 내 코드 배치 순서

1. import
2. type/inteface 선언
3. 상수/객체
4. 컴포넌트 시작
   1. state/ref 등 훅 사용
   2. 변수
   3. 함수
   4. useEffect
   5. jsx 반환부
5. export

예시

```tsx
// 1. import
import { useState, useEffect } from 'react';

// 2. type/inteface 선언
interface UserCardProps {
  name: string;
  status?: 'online' | 'offline';
}

// 3. 상수/객체 선언
const DEFAULT_STATE = 'online';

// 4. 컴포넌트 시작
const UserCard = ({ name, status = DEFAULT_STATE }: UserCardProps) => {
  // state 등 훅 사용
  const [isOnline, setIsOnline] = useState(status === 'online');

  // 변수
  const statusText = isOnline ? 'Online' : 'Offline';

  // 함수
  const toggleStatus = () => setIsOnline(prev => !prev);

  // useEffect
  useEffect(() => {
    setIsOnline(status === 'online');
  }, [status]);

  // JSX 반환
  return (
    <div className="w-full bg-white">
      <div>{name}</div>
      <div>{statusText}</div>
    </div>
  );
};

`;

export default UserCard;
```

# 기타 규칙

- 절대 경로 지정 시 “@”은 다른 라이브러리랑 혼동될 수 있어 “#” prefix를 사용해주세요.

  ```tsx
  import { QueryClient } from '@tanstack/react-query'; // 외부 라이브러리

  import { isEmpty } from '#shared/utils/boolean'; // 내부 파일 import
  ```

- 도메인 내부의 도메인 참조시에는 상대경로를 사용해주세요.

  ```tsx
  // /domain/core/user/ui/UserProfileSummary/index.tsx

  import { useUserProfile } from '../../store'; // 같은 user 도메인 내부 참조 - 상대경로

  import Avatar from '#shared/ui/Avatar'; // 다른 레이어(shared) 참조 - # prefix 절대경로
  ```
