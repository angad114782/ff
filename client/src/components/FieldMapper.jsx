import { useRef, useState } from 'react'

// Two columns: what we need stays fixed on the right, and the vendor's response fields are dragged up
// and down on the left until each one sits opposite its match (or tap a field, then tap a row).
// The saved mapping keeps its shape ({ match, total, list, label, qty, poQty, poExpected }).

const TARGETS = [
  { key: 'match', label: 'Item ID', primary: 'ExternalItemId', hint: 'Only needed if the response lists many items' },
  { key: 'total', label: 'Total stock', primary: 'QtyFree', hint: 'Optional, otherwise rows are added up', numeric: true },
  { key: 'label', label: 'Row name', primary: 'lots[].lotNo / locationCode', hint: 'e.g. lot, warehouse or city', inList: true },
  { key: 'location', label: 'Row location', primary: 'locationCode', hint: 'Optional, shown in the Loc column', inList: true },
  { key: 'qty', label: 'Row quantity', primary: 'lots[].quantity', hint: 'Stock in each row', numeric: true, inList: true },
  { key: 'poQty', label: 'PO quantity', primary: 'QtyPO', hint: 'Optional', numeric: true },
  { key: 'poExpected', label: 'PO expected date', primary: 'DeliveryDate', hint: 'Optional' },
  { key: 'image', label: 'Image', primary: 'images[0]', hint: 'Optional, a https picture address' },
]

const ROW = '[0].'
const fromRoot = (list, rel) => (list === '$' ? `${ROW}${rel}` : `${list}${ROW}${rel}`)

function toSlots(m) {
  const slots = { match: m.match, total: m.total, poQty: m.poQty, poExpected: m.poExpected, image: m.image }
  if (m.list && m.location) slots.location = fromRoot(m.list, m.location)
  if (m.list && m.label) slots.label = fromRoot(m.list, m.label)
  if (m.list && m.qty) slots.qty = fromRoot(m.list, m.qty)
  // A { "Delhi": 10 } style list has no row fields: the list itself sits opposite quantity.
  if (m.list && !m.qty && !m.label) slots.qty = m.list
  return slots
}

// "data.rows[0].qty" -> { list: "data.rows", rel: "qty" }; null when the field is not in a list.
function splitRow(path) {
  const i = path.lastIndexOf(ROW)
  return i === -1 ? null : { list: path.slice(0, i) || '$', rel: path.slice(i + ROW.length) }
}

function toMapping(slots) {
  const m = {
    match: slots.match ?? '',
    total: slots.total ?? '',
    list: '',
    label: '',
    qty: '',
    poQty: slots.poQty ?? '',
    poExpected: slots.poExpected ?? '',
    image: slots.image ?? '',
    location: '',
  }
  const label = slots.label && splitRow(slots.label)
  const qty = slots.qty && splitRow(slots.qty)
  const loc = slots.location && splitRow(slots.location)
  if (loc) Object.assign(m, { list: loc.list, location: loc.rel })
  if (label) Object.assign(m, { list: label.list, label: label.rel })
  if (qty) Object.assign(m, { list: qty.list, qty: qty.rel })
  else if (slots.qty) m.list = slots.qty
  return m
}

const shortName = (path) => path.split('.').pop().replace('[0]', '')
const parentOf = (path) => {
  const i = path.lastIndexOf('.')
  return i === -1 ? '' : path.slice(0, i).replaceAll('[0]', '')
}

export default function FieldMapper({ paths, mapping, onChange }) {
  const [selected, setSelected] = useState(null) // { path, from } after a tap
  const [drag, setDrag] = useState(null) // { path, x, y } while a field is being dragged
  const [message, setMessage] = useState('')
  const boxRef = useRef(null)

  const slots = toSlots(mapping)
  const fields = paths.filter(
    (p) => p.kind === 'value' || !paths.some((other) => other.path.startsWith(`${p.path}[0]`)),
  )
  const fieldFor = (path) => fields.find((f) => f.path === path)
  const isMap = (path) => fieldFor(path)?.kind === 'list'
  const placed = new Set(Object.values(slots).filter(Boolean))
  const unused = fields.filter((f) => !placed.has(f.path))

  function problemWith(target, path) {
    if (target.numeric && !isMap(path) && fieldFor(path)?.numeric === false) {
      return `${target.label} needs a number, and "${shortName(path)}" is not one.`
    }
    if (target.inList && !splitRow(path) && !(target.key === 'qty' && isMap(path))) {
      return `${target.label} must come from a list in the response.`
    }
    return ''
  }

  // Dropping on an occupied row swaps the two fields when the dragged one came from another row.
  function place(key, path, from) {
    setSelected(null)
    if (from === key) return
    const next = { ...slots }
    const occupant = next[key]
    if (from) delete next[from]
    if (key) next[key] = path
    if (from && key && occupant) next[from] = occupant

    for (const t of TARGETS) {
      const problem = (next[t.key] && next[t.key] !== slots[t.key] && problemWith(t, next[t.key])) || ''
      if (problem) return setMessage(problem)
    }
    if (next.qty && isMap(next.qty)) delete next.label
    const a = next.label && splitRow(next.label)
    const b = next.qty && splitRow(next.qty)
    const c = next.location && splitRow(next.location)
    if ((a && b && a.list !== b.list) || (c && (a ?? b) && c.list !== (a ?? b).list)) return setMessage('Row name and row quantity must come from the same list.')

    setMessage('')
    onChange(toMapping(next))
  }

  function startDrag(e, path, from) {
    e.preventDefault()
    const at = (ev) => {
      const r = boxRef.current.getBoundingClientRect()
      return { path, x: ev.clientX - r.left, y: ev.clientY - r.top }
    }
    setSelected(null)
    setDrag(at(e))

    const move = (ev) => setDrag(at(ev))
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      const slot = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]')?.dataset.slot
      if (slot) place(slot === 'unused' ? '' : slot, path, from)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const chip = (path, from) => {
    const f = fieldFor(path)
    const isSelected = selected?.path === path
    return (
      <div
        key={path}
        role="button"
        tabIndex={0}
        title={path}
        onClick={(e) => {
          e.stopPropagation()
          setSelected(isSelected ? null : { path, from })
        }}
        className={`flex h-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
          isSelected ? 'border-terracotta bg-terracotta/10' : 'border-sage-grey bg-linen hover:bg-sand/50'
        } ${drag?.path === path ? 'opacity-40' : ''}`}
      >
        <span
          data-handle={path}
          onPointerDown={(e) => startDrag(e, path, from)}
          aria-hidden="true"
          className="shrink-0 cursor-grab touch-none select-none px-1 text-lg leading-none text-ink/40"
        >
          ⠿
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{shortName(path)}</span>
          <span className="block truncate text-xs text-ink/60">
            {f?.kind === 'list' ? 'list of quantities' : f?.sample || 'empty'}
            {parentOf(path) ? ` · ${parentOf(path)}` : ''}
          </span>
        </span>
        {from && (
          <button
            type="button"
            aria-label={`Remove ${shortName(path)}`}
            onClick={(e) => {
              e.stopPropagation()
              place('', path, from)
            }}
            className="shrink-0 px-1 text-ink/50 hover:text-terracotta-deep"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  const dropping = drag || selected

  return (
    <div ref={boxRef} className="relative space-y-1.5">
      <div className="grid grid-cols-2 gap-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">
        <p>Vendor's response</p>
        <p>Primary API field</p>
      </div>

      {TARGETS.map((t) => (
        <div key={t.key} className="grid min-h-14 grid-cols-2 gap-2">
          <div
            data-slot={t.key}
            onClick={() => selected && place(t.key, selected.path, selected.from)}
            className={slots[t.key] ? '' : `flex items-center justify-center rounded-md border border-dashed px-2 text-center text-xs ${
              dropping ? 'cursor-pointer border-terracotta bg-sand/50 text-ink/70' : 'border-sage-grey text-ink/40'
            }`}
          >
            {slots[t.key] ? chip(slots[t.key], t.key) : 'Drag a field here'}
          </div>
          <div className="rounded-md bg-sand/50 px-2.5 py-1.5">
            <span className="block truncate text-sm font-medium text-ink">
              {t.label} <span className="font-mono text-xs font-normal text-terracotta-deep">{t.primary}</span>
            </span>
            <span className="block truncate text-xs text-ink/60">{t.hint}</span>
          </div>
        </div>
      ))}

      <div
        data-slot="unused"
        onClick={() => selected?.from && place('', selected.path, selected.from)}
        className="!mt-3 max-h-64 space-y-1.5 overflow-y-auto border-t border-sage-grey pt-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Other fields in the response</p>
        {unused.length ? (
          <div className="grid gap-1.5 sm:grid-cols-2">{unused.map((f) => chip(f.path, null))}</div>
        ) : (
          <p className="text-xs text-ink/50">All fields are in use.</p>
        )}
      </div>

      {drag && (
        <div
          className="pointer-events-none absolute z-10 max-w-48 -translate-y-1/2 truncate rounded-md border border-terracotta bg-linen px-3 py-1.5 text-sm font-medium text-ink shadow-lg"
          style={{ left: drag.x + 8, top: drag.y }}
        >
          {shortName(drag.path)}
        </div>
      )}

      {message && <p className="text-sm text-terracotta-deep">{message}</p>}
    </div>
  )
}
