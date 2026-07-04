# Frontend integration (Next.js + Tailwind)

`ProductAssistant.tsx` is a controlled modal. A parent owns an `open` state and passes
`onClose`. Any button can open it.

## 1. Requirements
- Next.js (App Router) + Tailwind CSS
- `lucide-react` for icons:
  ```bash
  npm install lucide-react
  ```

## 2. Environment
Point the component at the running AI service (in `.env.local`):
```
NEXT_PUBLIC_ASSISTANT_API_URL=http://localhost:8001
```

## 3. Drop in the component
Copy `ProductAssistant.tsx` into your components folder, then control it from anywhere:

```tsx
'use client';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ProductAssistant } from '@/components/ProductAssistant';

export function CopilotLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open AI Copilot">
        <Sparkles className="h-4 w-4" />
      </button>
      <ProductAssistant open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Or mount it once globally (e.g. in your layout) and trigger from a navbar button.

## 4. Product link route
`openProduct()` navigates to `/browse/{id}` by default. Change that line to match
your store's product-detail route.

## 5. Data contract
The component calls `POST {ASSISTANT_URL}/copilot` with `{ question, history, mode }`
and expects:
```json
{
  "mode": "assistant | agent | off_topic",
  "answer": "text reply",
  "recommendations": [
    { "id": "…", "title": "…", "price": 4500, "category": "…", "images": ["…"] }
  ]
}
```
