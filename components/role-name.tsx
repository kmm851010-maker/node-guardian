export function RoleName({ name, role }: { name: string; role?: 'master' | 'staff' | null }) {
  if (!role) return <>{name}</>
  return (
    <span className="inline-flex items-baseline gap-0">
      {name}
      <span className={`text-[9px] font-black leading-none ml-px ${
        role === 'master' ? 'text-yellow-500' : 'text-red-500'
      }`}>
        {role === 'master' ? 'm' : 's'}
      </span>
    </span>
  )
}
