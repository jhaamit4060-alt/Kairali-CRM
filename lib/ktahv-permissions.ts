export type SessionUser = {
  id?: string
  email?: string
  name?: string
  permissions?: string[]
  action?: Record<string, string>
}

export type KtahvAction =
  | 'viewSelf'
  | 'viewAll'
  | 'editSelf'
  | 'editAll'
  | 'cancelSelf'
  | 'cancelAll'
  | 'approvalSelf'
  | 'approvalAll'
  | 'collectionSelf'
  | 'collectionAll'
  | 'arrivalFlightSelf'
  | 'arrivalFlightAll'
  | 'departureFlightSelf'
  | 'departureFlightAll'
  | 'accountsVerify'
  | 'foVerify'
  | 'checkOutVerify'

const ROLE_ACTIONS: Readonly<Record<string, readonly KtahvAction[]>> = {
  sales_agent: [
    'viewSelf',
    'editSelf',
    'cancelSelf',
    'approvalSelf',
    'collectionSelf',
    'arrivalFlightSelf',
    'departureFlightSelf',
  ],
  sales_manager: [
    'viewSelf',
    'editSelf',
    'cancelSelf',
    'approvalSelf',
    'collectionSelf',
    'arrivalFlightSelf',
    'departureFlightSelf',
  ],
  account_manager: ['viewAll', 'accountsVerify'],
  operation_manager: ['viewAll', 'approvalAll', 'collectionAll', 'foVerify'],
  fo_manager: ['viewAll', 'collectionAll', 'checkOutVerify'],
  supervisor: ['viewAll'],
}

export function ktahvRolesForUser(user: SessionUser): string[] {
  const raw = user.action?.ktahvPage
  if (!raw) return []
  return raw
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean)
}

export function hasKtahvAction(user: SessionUser, action: KtahvAction): boolean {
  if (user.permissions?.includes('all')) return true
  return ktahvRolesForUser(user).some((role) => ROLE_ACTIONS[role]?.includes(action))
}

export function canAccessKtahvTeamPage(user: SessionUser): boolean {
  return Boolean(
    user.permissions?.includes('all') ||
      user.permissions?.includes('team.view') ||
      hasKtahvAction(user, 'viewAll') ||
      hasKtahvAction(user, 'viewSelf'),
  )
}

function normalizedName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en')
}

export function isOwnKtahvBooking(user: SessionUser, assignedTo: unknown): boolean {
  const userName = normalizedName(user.name)
  const assignee = normalizedName(assignedTo)
  return Boolean(userName && assignee && userName === assignee)
}

export function canViewKtahvBooking(user: SessionUser, assignedTo: unknown): boolean {
  if (hasKtahvAction(user, 'viewAll') || user.permissions?.includes('all')) return true
  return hasKtahvAction(user, 'viewSelf') && isOwnKtahvBooking(user, assignedTo)
}

const MUTATION_ACTIONS = {
  cancelBooking: { self: 'cancelSelf', all: 'cancelAll' },
  paymentCollection: { self: 'collectionSelf', all: 'collectionAll' },
  approval: { self: 'approvalSelf', all: 'approvalAll' },
  accountStatusUpdate1: { all: 'accountsVerify' },
  accountStatusUpdate2: { all: 'accountsVerify' },
  accountStatusUpdate3: { all: 'accountsVerify' },
  foStatusUpdate1: { all: 'foVerify' },
  foStatusUpdate2: { all: 'foVerify' },
  checkoutStatusUpdate1: { all: 'checkOutVerify' },
  arrivalFlight: { self: 'arrivalFlightSelf', all: 'arrivalFlightAll' },
  departureFlight: { self: 'departureFlightSelf', all: 'departureFlightAll' },
} as const satisfies Record<string, { self?: KtahvAction; all: KtahvAction }>

export type KtahvMutationAction = keyof typeof MUTATION_ACTIONS

export function isKtahvMutationAction(value: string): value is KtahvMutationAction {
  return value in MUTATION_ACTIONS
}

export function canPerformKtahvMutation(
  user: SessionUser,
  action: KtahvMutationAction,
  assignedTo: unknown,
): boolean {
  if (user.permissions?.includes('all')) return true
  const required = MUTATION_ACTIONS[action]
  if (hasKtahvAction(user, required.all)) return true
  const selfAction = 'self' in required ? required.self : undefined
  return Boolean(
    selfAction &&
      hasKtahvAction(user, selfAction) &&
      isOwnKtahvBooking(user, assignedTo),
  )
}
