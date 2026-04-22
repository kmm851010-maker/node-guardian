interface PiUserDTO {
  uid: string
  username: string
}

interface AuthResult {
  accessToken: string
  user: PiUserDTO
}

interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void
  onReadyForServerCompletion: (paymentId: string, txid: string) => void
  onCancel: (paymentId: string) => void
  onError: (error: unknown, payment?: unknown) => void
}

interface PiSDK {
  init(config: { version: string; sandbox?: boolean }): void
  authenticate(scopes: string[], onIncompletePaymentFound: (payment: unknown) => void): Promise<AuthResult>
  createPayment(data: { amount: number; memo: string; metadata: Record<string, unknown> }, callbacks: PiPaymentCallbacks): void
}

declare global {
  interface Window {
    Pi?: PiSDK
  }
}

export {}
