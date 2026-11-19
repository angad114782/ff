import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Card, Input, Button, Skeleton, Badge } from './ui'
import { api } from '../api'

const SCANNER_ELEMENT_ID = 'barcode-scanner-view'

// Explicitly cover QR codes and the 1D barcode formats stock labels actually use,
// rather than leaving html5-qrcode to guess across every format it knows.
const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
]

export default function StockSearch({ detailPath }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = nothing searched yet
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const scannerRef = useRef(null)
  const requestRef = useRef(0)
  const aliveRef = useRef(true)
  const stoppingRef = useRef(Promise.resolve())

  // `scanned` marks camera input, which Business Central matches against the item's QR/barcode link.
  // Salesman searches are logged server-side.
  async function runSearch(text, { scanned = false } = {}) {
    const trimmed = text.trim()
    if (!trimmed) return
    const requestId = ++requestRef.current
    setSearching(true)
    setSearchError('')
    setResults(null)
    try {
      const param = scanned ? 'barcode' : 'q'
      const { items } = await api.get(`/api/stock/search?${param}=${encodeURIComponent(trimmed)}`)
      if (requestId !== requestRef.current) return // a newer search superseded this one
      if (items.length === 1) {
        navigate(detailPath(items[0].code))
        return
      }
      setResults(items)
    } catch (err) {
      if (requestId === requestRef.current) setSearchError(err.message)
    } finally {
      if (requestId === requestRef.current) setSearching(false)
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (query.trim()) runSearch(query)
  }

  // The camera starts when the Scan button is pressed and stops by itself once a code is read;
  // the search then runs automatically.
  async function startScanning() {
    await stoppingRef.current
    if (!aliveRef.current || scannerRef.current) return
    setScanError('')
    setScanning(true)
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: SCAN_FORMATS,
      // Use the phone's built-in detector when it has one: faster, and better with tilted codes.
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        // No fixed scan box: the whole camera picture is read, so square QR codes and wide
        // horizontal barcodes both work at any position.
        { fps: 15, aspectRatio: 1.333 },
        (decodedText) => {
          if (scannerRef.current !== scanner) return // already handled
          setQuery(decodedText)
          stopScanning()
          runSearch(decodedText, { scanned: true })
        },
        undefined,
      )
      // The page was left while the camera was still starting.
      if (!aliveRef.current || scannerRef.current !== scanner) release(scanner)
    } catch (err) {
      // html5-qrcode doesn't propagate the original DOMException — every
      // camera failure comes through as a plain string message instead, so
      // the actual reason has to be pattern-matched out of the text.
      const message = String(err)
      const reason = /NotAllowedError|Permission denied/i.test(message)
        ? 'Camera permission denied — allow camera access for this site and try again.'
        : /NotFoundError/i.test(message)
          ? 'No camera found on this device.'
          : /NotReadableError/i.test(message)
            ? 'Camera is already in use by another app.'
            : /OverconstrainedError/i.test(message)
              ? 'No camera on this device matches the requested settings.'
              : /not supported by the browser|mediaDevices not supported/i.test(message)
                ? 'Camera requires HTTPS (or localhost) — check the URL, or use manual search below.'
                : `Camera unavailable — ${message}`
      setScanError(reason)
      if (scannerRef.current === scanner) scannerRef.current = null
      setScanning(false)
    }
  }

  function release(scanner) {
    stoppingRef.current = scanner.stop().then(() => scanner.clear()).catch(() => {})
  }

  function stopScanning() {
    const scanner = scannerRef.current
    scannerRef.current = null
    setScanning(false)
    if (scanner) release(scanner)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stopScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card title="Barcode Scanner">
        {/* The camera box must already be on the page when the scanner starts, so it is always rendered. */}
        <div className={scanning ? 'space-y-3' : 'hidden'}>
          <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-lg border border-sage-grey" />
          <p className="text-center text-sm text-ink/70">Point the camera at the barcode or QR — the search runs by itself once it reads.</p>
        </div>
        {scanning ? (
          <Button variant="secondary" className="mt-3 w-full" onClick={stopScanning}>
            Cancel
          </Button>
        ) : (
          <Button className="w-full" onClick={startScanning} disabled={searching}>
            {searching ? 'Code read — searching…' : scanError ? 'Try camera again' : 'Scan Code'}
          </Button>
        )}
        {scanError && <p className="mt-3 text-sm text-terracotta-deep">{scanError}</p>}
      </Card>

      <Card title="Manual Search">
        <form className="flex gap-3" onSubmit={handleManualSubmit}>
          <Input
            id="itemCode"
            placeholder="Item no, name or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </form>
      </Card>

      {searching && (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {searchError && (
        <Card>
          <p className="text-center text-sm text-terracotta-deep">{searchError}</p>
        </Card>
      )}

      {results && results.length === 0 && (
        <Card>
          <p className="text-center text-sm text-ink/60">No item found for “{query}”.</p>
        </Card>
      )}

      {results && results.length > 1 && (
        <Card title={`${results.length} items found`}>
          <ul className="divide-y divide-sage-grey/60">
            {results.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  onClick={() => navigate(detailPath(item.code))}
                  className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-sand/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                    <span className="block text-xs text-ink/60">
                      {item.code}
                      {item.color ? ` · ${item.color}` : ''}
                    </span>
                  </span>
                  <Badge variant={item.status === 'in_stock' ? 'success' : 'error'}>
                    {item.total === undefined ? `${item.available} ${item.uom ?? ''}` : `Total ${item.total} ${item.uom ?? ''}`}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
