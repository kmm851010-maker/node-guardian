interface PiUserDTO {
  uid: string
  username: string
}

interface AuthResult {
  accessToken: string
  user: PiUserDTO
}

interface PiSDK {
  authenticate(
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void
  ): Promise<AuthResult>
  init(config: { version: string; sandbox?: boolean }): void
}

declare global {
  interface Window {
    Pi?: PiSDK
  }
}

export {}
