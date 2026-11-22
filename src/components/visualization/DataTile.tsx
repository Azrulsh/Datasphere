import { memo, useState } from 'react'
import type { Person } from '../../types/person'
import { classifyNetWorth, formatNetWorth } from '../../utils/netWorth'

export const DataTile = memo(function DataTile({ person, index }: { person: Person; index: number }) {
  const [failedPhoto, setFailedPhoto] = useState(false)
  const demographics = `${person.age} years · ${person.country}`
  const worth = formatNetWorth(person.netWorth)
  const initials = person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')
  return (
    <article className={`data-tile tier-${classifyNetWorth(person.netWorth)}`} aria-label={`${person.name}, profile ${index + 1}`}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-800 text-xl text-slate-300">
          {person.photo && !failedPhoto
            ? <img className="size-full object-cover" src={person.photo} alt={`${person.name} portrait`} draggable={false} onError={() => setFailedPhoto(true)} />
            : <span aria-label="Portrait unavailable">{initials}</span>}
        </div>
        <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <h2 className="truncate text-lg font-semibold text-slate-100" title={person.name}>{person.name}</h2>
      <p className="mt-1 truncate text-sm text-slate-400" title={demographics}>{demographics}</p>
      <p className="mt-3 truncate text-sm text-slate-300" title={person.interest}>{person.interest}</p>
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-xs tracking-wider text-slate-400">NET WORTH · USD</p>
        <p className="worth-value mt-1 truncate font-mono text-xl font-medium" title={worth}>{worth}</p>
      </div>
    </article>
  )
})
