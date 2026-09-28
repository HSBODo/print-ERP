## 요약

이 문서는 React 기반 프론트엔드 프로젝트에서 FSD를 확장하여 도메인 중심 레이어 구조를 스펙화한 아키텍처 문서입니다. 코딩 에이전트와 인간 개발자 모두가 참조하도록 작성되었습니다. 본 스펙은 레이어 경계, 의존성 규칙을 정의하여 일관된 코드 생성과 유지보수를 가능하게 합니다.

## 레이어 모델

| Layer | Responsibility | Allowed Imports | Forbidden Imports |
| --- | --- | --- | --- |
| page (`src/routes`) | 라우팅, 레이아웃, 페이지 UI 구성 | composition, domain/core, domain/support, entity, shared | page(상호 참조) |
| composition | 여러 도메인의 UI/로직 조합 | domain/core, domain/support, entity, shared | page, composition(상호참조) |
| entity | 도메인 간 공유되는 entity | shared | page, domain, composition, entity(상호참조) |
| domain/core | 단일 비즈니스 컨텍스트의 feature 단위 UI·로직·API·상태 | domain/support, entity, shared | page, composition, domain/core(상호참조) |
| domain/support | 여러 core 도메인에 소비되는 공유 capability | entity, shared | page, composition, domain/core, domain/support(상호참조) |
| shared | 도메인 독립적 공용 UI/유틸/hooks/provider | shared | page, composition, domain, entity |

## 레이어 정의

### page

- 레이어 이름은 page이지만 폴더는 TanStack Router 기본값인 `src/routes`를 쓴다. (page 레이어 = `src/routes`)
- 경로 기반 라우팅/레이아웃을 구성하고 페이지 컴포넌트들을 작성한다.
- 페이지는 가급적 domain, composition의 UI의 배치 역할만 하는 얇은 wrapper처럼 만들어야 한다.
- src/routes 디렉토리 내부에서 TanStack Router 파일 기반 라우팅 규칙에 따라 각 page 컴포넌트, 레이아웃을 작성한다. (라우트 트리 `routeTree.gen.ts`는 플러그인이 생성한다)
- 페이지에 종속된 하위 ui, hooks, type, utils는 해당 페이지의 -internal에 작성한다 (TanStack에서 `_` 접두사는 경로 없는 레이아웃, `-` 접두사는 라우트 제외)

### composition

- composition은 여러 domain을 조합하는 레이어이다.
- composition 간 상호 import는 금지된다.
- src/composition 디렉토리 내부에서 각 composition에 대한 ui, hooks, type, utils 등을 구조화해 작성한다.

### entity

- entity는 두 개 이상의 domain이 공통으로 참조하는 비즈니스 객체 타입/인터페이스를 정의하는 레이어이다.
- 로직이나 상태 관리는 포함하지 않으며, 타입 정의와 최소한의 유틸(변환 함수 등)만 둔다.
- entity 간 상호 import는 금지된다.
- src/entity 디렉토리 내부에서 각 entity에 대한 type, utils 등을 작성한다.
- entity는 최소 공통 필드만 정의한다. 도메인별로 필요한 필드는 각 domain에서 extends해서 사용한다.

### domain/core

- core는 단일 비즈니스 컨텍스트의 feature 단위 UI·로직·API·상태 관리 단위이다.
- core 도메인 간 상호 import는 금지된다.
- core 도메인은 support 도메인을 import할 수 있다.
- src/domain/core 디렉토리 내부에서 각 도메인에 대한 ui, hooks, type, utils 등을 구조화해 작성한다.

### domain/support

- support는 여러 core 도메인에 소비되는 공유 capability 단위이다. 단독 페이지를 갖지 않으며 다른 도메인을 지원한다.
- support 도메인 간 상호 import는 금지된다.
- support 도메인은 core 도메인을 import할 수 없다.
- src/domain/support 디렉토리 내부에서 각 도메인에 대한 ui, hooks, type, utils 등을 구조화해 작성한다.

### shared

- page, composition, domain, entity 레이어가 import되면 안된다.
- shared 간의 상호 import는 허용된다.
- 도메인 관련 없는 공용 컴포넌트, 함수, 커스텀 훅 등을 작성한다.

## 결정 규칙

코드를 작성할 때 다음 규칙을 따른다.

- 두 개 이상의 도메인을 조합하는 로직은 composition에서만 작성한다.
- 도메인 의미가 없는 로직(순수 UI/유틸)은 shared에 둔다.
- 여러 core 도메인이 공유하는 capability(API/상태 포함)는 domain/support에 배치한다.
- 단일 비즈니스 컨텍스트의 feature 단위는 domain/core에 배치한다.

## 핵심 규칙

다음 규칙은 모든 규칙에 있어 최우선시 된다.

- 코드 작성 시 레이어 참조 규칙을 우선시한다.
- domain/core 간 import는 절대 금지된다.
- domain/support 간 import는 절대 금지된다.
- domain/support에서 domain/core import는 절대 금지된다.
- shared는 상위 레이어를 import할 수 없다.

## 모범사례

코딩 에이전트는 다음 패턴을 기반으로 추론한다.

1.  레이어 배치 예시
    - page

      ```
      /routes
      /routes/__root.tsx
      /routes/_guest/login/index.tsx
      /routes/_member/route.tsx
      /routes/_member/product/order/index.tsx
      /routes/_member/product/cart/index.tsx
      /routes/_member/product/$productId/index.tsx
      /routes/_member/account/index.tsx
      /routes/_member/account/-internal/utils/format.ts
      /routes/_member/account/-internal/ui/SubView.tsx
      ```

    - composition

      ```
      /composition
      /composition/dashboard/
      /composition/dashboard/ui/DashBoard/index.tsx
      /composition/dashboard/utils
      /composition/dashboard/utils/format.ts
      /composition/orderAnalyzer/
      /composition/userAnalyzer/
      ```

    - domain/core

      ```
      /domain/core
      /domain/core/user/ui
      /domain/core/user/ui/UserList/index.tsx
      /domain/core/user/ui/ProfileBox/index.tsx
      /domain/core/user/ui/UserItem/index.tsx
      /domain/core/user/ui/UserItem/ui/UserItem.tsx
      /domain/core/user/ui/UserItem/ui/UserUnit.tsx
      /domain/core/user/ui/UserItem/ui/NickNameBar.tsx
      /domain/core/user/ui/UserProvider/index.tsx
      /domain/core/user/api.ts
      /domain/core/user/utils/format.ts
      /domain/core/user/type.ts
      /domain/core/user/data.ts
      /domain/core/user/store.ts
      /domain/core/hospital/ui
      /domain/core/hospital/api.ts
      /domain/core/hospital/type.ts
      /domain/core/auth/ui
      /domain/core/auth/api.ts
      ```

    - domain/support

      ```
      /domain/support
      /domain/support/file/ui
      /domain/support/file/ui/FileUploader/index.tsx
      /domain/support/file/api.ts
      /domain/support/file/type.ts
      ```

    - entity

      ```
      /entity
      /entity/user/type.ts
      /entity/user/utils/format.ts
      /entity/hospital/type.ts
      ```

    - shared

      ```
        /shared
        /shared/ui
        /shared/ui/Button.ts
        /shared/ui/Modal.ts
        /shared/utils
        /shared/utils/string.ts
        /shared/utils/number.ts
        /shared/provider/ModalProvider.ts
        /shared/hooks/useModal.ts
      ```

2.  컴포넌트 예시
    - page

      ```
        // /routes/_member/dashboard/index.tsx

        import { createFileRoute } from "@tanstack/react-router";

        import DashBoard from "#composition/dashBoard/ui/DashBoard";
        import Profile from "#domain/core/user/ui/Profile";
        import Filter from "#shared/ui/Filter"

        import Layout from "./-internal/ui/Layout"
        import Terms from "./-internal/ui/Terms"

        export const Route = createFileRoute("/_member/dashboard/")({
          component: DashBoardPage,
        });

        function DashBoardPage() {

          return (
            <Layout>
              <Profile/>
              <DashBoard/>
              <Filter/>
              <Terms/>
            </Layout>
          );
        }
      ```

    - composition

      ```
        // /composition/dashBoard/ui/DashBoard/index.tsx

        import UserProfileSummary from "#domain/core/user/ui/UserProfileSummary";
        import RecentOrders from "#domain/core/order/ui/RecentOrders";
        import Card from "#shared/ui/Card";

        const DashBoard = () => {
          return (
            <div>
              <Card title="User Info">
                <UserProfileSummary />
              </Card>

              <Card title="Recent Orders">
                <RecentOrders />
              </Card>
            </div>
          );
        }

        export default DashBoard;
      ```

    - entity

      ```
      // /entity/user/type.ts  (최소 공통 필드만 정의)

      export interface UserBase {
        id: string;
        name: string;
      }
      ```

      ```
      // /domain/core/user/type.ts  (도메인에서 extends)

      import type { UserBase } from "#entity/user/type";

      export interface User extends UserBase {
        isContracted: boolean;
      }
      ```

      ```
      // /domain/core/auth/type.ts  (다른 도메인에서도 독립적으로 extends)

      import type { UserBase } from "#entity/user/type";

      export interface AuthUser extends UserBase {
        token: string;
      }
      ```

    - domain/core (support 도메인 참조 예시)

      ```
      // /domain/core/user/ui/ProfileEditor/index.tsx
      // user 도메인에서 file support 도메인을 참조하는 예시

      import { useFileUpload } from "#domain/support/file/store";
      import Avatar from "#shared/ui/Avatar";

      const ProfileEditor = () => {
        const { upload } = useFileUpload();

        return (
          <div>
            <Avatar />
            <button onClick={() => upload()}>프로필 사진 변경</button>
          </div>
        );
      }

      export default ProfileEditor;
      ```

    - domain/support

      ```
      // /domain/support/file/store.ts
      // file support 도메인은 user, hospital 등 core 도메인을 알지 못한다

      import { useMutation } from "@tanstack/react-query";
      import { fileApi } from "./api";

      const useFileUpload = () => {
        const { mutateAsync: upload } = useMutation({
          mutationFn: fileApi.upload,
        });

        return { upload };
      }

      export { useFileUpload };
      ```

    - domain/core

      ```
      // /domain/core/user/ui/UserProfileSummary/index.tsx

      import { useUserProfile } from "../../store";

      import Avatar from "#shared/ui/Avatar";

      const UserProfileSummary = () => {
        const { user } = useUserProfile();

        if (!user) return null;

        return (
          <div>
            <Avatar src={user.avatar} />
            <div>{user.name}</div>
          </div>
        );
      }

      export default UserProfileSummary;
      ```

      ```
      // /domain/core/user/store.ts

      import { useQuery } from "@tanstack/react-query";
      import { userApi } from "./api";

      const useUserProfile = () => {
        const { data, isLoading } = useQuery({
          queryKey: ["user", "profile"],
          queryFn: userApi.fetchUserProfile,
        });

        return { user: data, isLoading };
      }

      export { useUserProfile };
      ```

    - shared

      ```
      // /shared/utils/date.ts

      /**
      * 날짜를 YYYY-MM-DD 문자열로 변환합니다.
      */
      const formatDate = (date: Date): string => {
        return date.toISOString().split("T")[0];
      }

      /**
      * 오늘 날짜인지 체크합니다.
      */
      const isToday = (date: Date): boolean => {
        const today = new Date();
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      }

      export { formatDate, isToday };
      ```
