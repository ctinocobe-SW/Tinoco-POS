import { LoginForm } from '@/components/layout/LoginForm'

export const metadata = {
  title: 'Acceso — POS TINOCO',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-semibold text-brand-accent tracking-wide mb-1">
            TINOCO
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Sistema POS
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} TINOCO software. Todos los derechos reservados.
        </p>
      </div>
    </main>
  )
}
