# Frontend Architecture & Development Rules

Tài liệu này mô tả kiến trúc frontend và các quy tắc bắt buộc phải tuân theo.
Dành cho cả người đọc lẫn AI agent làm việc trên codebase này.

---

## 1. Tech stack

- **React 18** + **TypeScript**
- **Vite** (build tool, dev server với proxy `/api` → `localhost:8000`)
- **React Router v6** (client-side routing)
- **Zustand** (global state management)
- **Axios** (HTTP client, instance duy nhất tại `src/lib/axios.ts`)
- **Tailwind CSS v4** (styling)
- **clsx** (conditional class merging qua `src/lib/cn.ts`)

---

## 2. Kiến trúc tổng quan

```
frontend/src/
├── features/        ← Mỗi tính năng là một thư mục riêng (feature-based structure)
├── components/
│   ├── ui/          ← Các component tái sử dụng thuần UI (Button, Card, Input, ...)
│   └── layout/      ← Layout shells (AppLayout, AdminLayout)
├── store/           ← Zustand stores, mỗi domain một file
├── types/           ← TypeScript interfaces toàn app (index.ts)
├── lib/             ← Tiện ích nhỏ: axios.ts, cn.ts
├── router/          ← Route definitions và route guards
├── i18n/            ← Internationalization (locales)
└── styles/          ← Global CSS
```

### Luồng dữ liệu

```
User interaction
    → Feature Component     (gọi API hoặc đọc store)
    → Zustand Store         (lưu trạng thái dùng chung)
    → api (axios instance)  (gọi backend /api/v1/...)
    → Backend response      (cập nhật store hoặc local state)
    → Re-render
```

---

## 3. Các layer và trách nhiệm

### features/ — Tính năng

Mỗi tính năng (feature) là một thư mục chứa tất cả code liên quan đến tính năng đó:

| Thư mục | Tính năng |
|---|---|
| `features/auth/` | Đăng nhập, profile |
| `features/dashboard/` | Trang chủ, widget flashcard |
| `features/dictionary/` | Tra cứu từ điển |
| `features/notebooks/` | Quản lý sổ tay |
| `features/flashcards/` | Ôn tập flashcard |
| `features/my-notes/` | Ghi chú cá nhân |
| `features/radicals/` | Bộ thủ Hán tự |
| `features/search-history/` | Lịch sử tìm kiếm |
| `features/settings/` | Cài đặt tài khoản |
| `features/admin/` | Quản trị (admin only) |
| `features/shared/` | Component dùng chung giữa nhiều features |

**KHÔNG** đặt logic của feature A vào thư mục của feature B.

### components/ui/ — Primitive UI Components

- Các component thuần UI, không biết gì về business logic hay API.
- Nhận props, render HTML, không gọi store hay axios.
- Ví dụ: `Button`, `Card`, `Input`, `Select`, `Flashcard`.

### store/ — Zustand Global State

- Mỗi domain có một file store riêng.
- Chỉ lưu state cần chia sẻ giữa nhiều component. State cục bộ dùng `useState`.
- Store không gọi API trực tiếp trừ khi action đó là async flow của chính store đó (như `auth.store.ts` có `login()`, `fetchMe()`).

| File | Quản lý |
|---|---|
| `auth.store.ts` | User hiện tại, token, login/logout |
| `dictionary.store.ts` | Tabs tìm kiếm, query, kết quả |
| `notebook.store.ts` | Version counter để invalidate cache notebook |
| `flashcard.store.ts` | State phiên ôn tập flashcard |
| `ui.store.ts` | UI state dùng chung: modal đang mở, item đang chọn |
| `settings.store.ts` | Cài đặt người dùng |

### types/index.ts — TypeScript Interfaces

- **Tất cả** interfaces dùng chung phải khai báo ở đây.
- Không tự định nghĩa interface inline trong component nếu type đó dùng ở nhiều nơi.
- Tên interface phải khớp với schema backend tương ứng.

### lib/ — Shared Utilities

- `axios.ts`: instance axios duy nhất với baseURL `/api/v1`, JWT interceptor, và 401 redirect.
- `cn.ts`: wrapper `clsx` để merge Tailwind class có điều kiện.

### router/ — Routing

- `index.tsx`: toàn bộ route definitions.
- `ProtectedRoute.tsx`: redirect về `/login` nếu chưa đăng nhập.
- `AdminRoute.tsx`: redirect nếu không phải admin.
- `UserRoute.tsx`: route cho user thường.

---

## 4. Quy tắc bắt buộc

### 4.1 Mọi API call phải dùng instance axios từ `@/lib/axios`

**Sai:**
```typescript
import axios from 'axios'
const { data } = await axios.get('/api/v1/notebooks')  // ← thiếu auth header
```

**Đúng:**
```typescript
import api from '@/lib/axios'
const { data } = await api.get('/notebooks')  // baseURL đã là /api/v1
```

Instance này tự động đính kèm JWT token và xử lý 401. Không bao giờ tạo axios instance mới.

### 4.2 URL API phải nhất quán với backend

API prefix đã là `/api/v1` trong `axios.ts`. Khi gọi:
```typescript
api.get('/notebooks/flashcards')        // → /api/v1/notebooks/flashcards ✓
api.get('/api/v1/notebooks/flashcards') // → /api/v1/api/v1/... ✗ double prefix
```

Khi backend đổi URL, phải cập nhật cả frontend. Không được tự ý đổi URL phía frontend mà không đổi backend.

### 4.3 State dùng chung → Zustand Store, state cục bộ → useState

**State cục bộ** (chỉ dùng trong 1 component): dùng `useState` / `useReducer`.

**State dùng chung** (nhiều component cần, hoặc persist qua navigation): dùng Zustand store.

**Sai:**
```typescript
// Truyền prop drilling qua 4 cấp component
<NotebooksPage selectedChar={selectedChar} onCharSelect={setSelectedChar} ... />
```

**Đúng:**
```typescript
// Dùng ui.store cho UI state dùng chung
const { selectedNotebookChar, setSelectedNotebookChar } = useUIStore()
```

### 4.4 Type mọi thứ — không dùng `any`

```typescript
// Sai
const [data, setData] = useState<any>(null)

// Đúng
import type { NotebookResponse } from '@/types'
const [data, setData] = useState<NotebookResponse | null>(null)
```

Nếu type chưa có trong `types/index.ts`, thêm vào đó, không định nghĩa inline trong component.

### 4.5 Feature components không import lẫn nhau trực tiếp

**Sai:**
```typescript
// Trong features/notebooks/NotebooksPage.tsx
import { FlashcardWidget } from '@/features/dashboard/FlashcardWidget'
```

**Đúng:** Nếu component cần dùng chung, chuyển vào `features/shared/` hoặc `components/`.

### 4.6 Primitive UI components không được biết đến store hay API

`components/ui/` chỉ nhận props và render. Không có `useAuthStore()`, `api.get()`, hay bất kỳ side effect nào bên trong.

### 4.7 Không hardcode text tiếng Việt rải rác trong component

Nếu dự án dùng i18n (thư mục `src/i18n/locales/`), mọi chuỗi hiển thị phải dùng translation key. Không hardcode string trực tiếp vào JSX nếu cùng chuỗi đó xuất hiện ở nhiều nơi.

### 4.8 Styling chỉ dùng Tailwind — không viết CSS file riêng cho component

```typescript
// Sai
import styles from './Button.module.css'

// Đúng
<button className={cn('px-4 py-2 rounded bg-blue-500', disabled && 'opacity-50')}>
```

Dùng `cn()` từ `@/lib/cn` để merge class có điều kiện.

---

## 5. Routing conventions

- Route user thường nằm trong `UserRoute` wrapper (tự động redirect nếu bị ban).
- Route admin nằm trong `AdminRoute` wrapper (redirect nếu không phải admin).
- Wildcard `*` redirect về `/` — không để 404 trắng.
- Mọi route mới phải thêm vào `router/index.tsx`, không tạo router riêng.

---

## 6. Auth flow

1. Login → backend trả `access_token` JWT.
2. Token lưu vào `localStorage` và `auth.store.ts`.
3. `axios.ts` interceptor tự đính kèm token vào mọi request.
4. Nếu backend trả 401 → interceptor xóa token và redirect `/login`.
5. Khi app load, `fetchMe()` được gọi để restore user session.

Không lưu thông tin nhạy cảm ngoài token vào `localStorage`.

---

## 7. Conventions chung

- **Tên file component**: PascalCase (`NotebooksPage.tsx`, `FlashcardWidget.tsx`).
- **Tên file store/lib/util**: camelCase với hậu tố rõ ràng (`auth.store.ts`, `axios.ts`).
- **Tên interface**: PascalCase, phản ánh đúng entity (`NotebookResponse`, `FlashcardCardResponse`).
- **Import alias**: dùng `@/` thay vì relative path dài (`@/store/ui.store` thay vì `../../store/ui.store`).
- **Async trong component**: luôn có loading state và error handling, không để UI trắng khi đang fetch.
- **NDJSON streaming** (notebook entries preview): đọc từng dòng qua `ReadableStream`, không đợi toàn bộ response mới render.
