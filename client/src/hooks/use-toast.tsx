// Adapted from shadcn/ui (https://ui.shadcn.com/docs/components/toast)
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast as useToastOriginal } from "@/components/ui/use-toast"
import { useLanguage } from "./use-language"

interface ToastProps extends Omit<React.ComponentProps<typeof Toast>, "children"> {
  title?: string
  titleKey?: string
  titleParams?: Record<string, string | number>
  description?: string
  descriptionKey?: string
  descriptionParams?: Record<string, string | number>
  action?: React.ReactNode
}

export function Toaster() {
  const { toasts } = useToastOriginal()
  const { t } = useLanguage()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, titleKey, titleParams, description, descriptionKey, descriptionParams, action, ...props }) => {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {(title || titleKey) && (
                <ToastTitle>
                  {titleKey ? t(titleKey, titleParams) : title}
                </ToastTitle>
              )}
              
              {(description || descriptionKey) && (
                <ToastDescription>
                  {descriptionKey ? t(descriptionKey, descriptionParams) : description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

// Export a modified version that supports translation keys
export function useToast() {
  const { toast: originalToast, ...rest } = useToastOriginal()
  
  // Wrapper function that handles both direct strings and translation keys
  const toast = (props: ToastProps) => {
    return originalToast(props)
  }
  
  return { toast, ...rest }
}