import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Card, Input, Button, Skeleton } from './ui'
import { stockItems } from '../mock/data'
import { useApp } from '../context/AppContext'

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

export default function StockSearch({ logActivity = true, detailPath }) {
  const navigate = useNavigate()
  const { currentUser, addLog } = useApp()
  const [query, setQuery] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const scannerRef = useRef(null)

  function runSearch(code) {
    const trimmed = code.trim()
    setSearching(true)
    setNotFound(false)
    // Artificial delay standing in for a real GET /api/stock/search call.
    setTimeout(() => {
      const match = stockItems.find((item) => item.code.toLowerCase() === trimmed.toLowerCase())
      setSearching(false)
      // Activity Logs are scoped to salesman logins/searches — admin's own
      // lookups here shouldn't show up under the "Salesman" column.
      if (logActivity) {
        addLog({
          type: 'search',
          name: currentUser?.name ?? 'Unknown',
          email: currentUser?.email ?? '—',
          query: trimmed,
          found: Boolean(match),
        })
      }
      if (match) {
        navigate(detailPath(match.code))
      } else {
        setNotFound(true)
      }
    }, 500)
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (query.trim()) runSearch(query)
  }

  async function startScanning() {
    setScanError('')
    setScanning(true)
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { formatsToSupport: SCAN_FORMATS, verbose: false })
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 200 } },
        (decodedText) => {
          setQuery(decodedText)
          runSearch(decodedText)
          stopScanning()
        },
        undefined,
      )
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
      setScanning(false)
    }
  }

  function stopScanning() {
    const scanner = scannerRef.current
    if (scanner) {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => () => stopScanning(), [])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card title="Barcode Scanner">
        {scanning ? (
          <div className="space-y-3">
            <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-lg border border-sage-grey" />
            <Button variant="secondary" className="w-full" onClick={stopScanning}>
              Stop Scanning
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={startScanning}>
            Start Camera Scan
          </Button>
        )}
        {scanError && <p className="mt-3 text-sm text-terracotta-deep">{scanError}</p>}
      </Card>

      <Card title="Manual Search">
        <form className="flex gap-3" onSubmit={handleManualSubmit}>
          <Input
            id="itemCode"
            placeholder="e.g. FF-CUSH-2201"
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

      {notFound && (
        <Card>
          <p className="text-center text-sm text-ink/60">No item found for “{query}”.</p>
        </Card>
      )}
    </div>
  )
}
