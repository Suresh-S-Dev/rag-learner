import { Toaster as Sonner } from 'sonner'

function Toaster() {
  return (
    <Sonner
      theme="dark"
      className="toaster"
      position="top-right"
      offset={20}
      gap={8}
      expand
      visibleToasts={4}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'toast-pill',
          title: 'toast-pill-title',
          description: 'toast-pill-title',
          closeButton: 'toast-pill-close',
          icon: 'toast-pill-icon',
        },
      }}
    />
  )
}

export { Toaster }
