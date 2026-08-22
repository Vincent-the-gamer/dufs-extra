// 字幕 → WebVTT 转换（纯函数，离线可用）
// 支持：VTT（原样）、SRT（逗号毫秒 → 点号毫秒）、ASS/SSA（Dialogue 行解析）

function vttTime(ms: number): string {
  let t = Math.max(0, Math.round(ms))
  const h = Math.floor(t / 3600000)
  t %= 3600000
  const m = Math.floor(t / 60000)
  t %= 60000
  const s = Math.floor(t / 1000)
  const r = t % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`
}

export function convertSubtitleToVtt(content: string, ext: string): string {
  if (ext === 'vtt') return ensureWebVtt(content)
  if (ext === 'srt') return srtToVtt(content)
  if (ext === 'ass' || ext === 'ssa') return assToVtt(content)
  return content
}

function ensureWebVtt(text: string): string {
  const t = text.replace(/^\uFEFF/, '').replace(/\r/g, '')
  return t.trimStart().startsWith('WEBVTT') ? t : 'WEBVTT\n\n' + t
}

function srtToVtt(text: string): string {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')
  const out: string[] = ['WEBVTT']
  for (const line of lines) {
    if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) {
      out.push(line.replace(/,/g, '.'))
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function assTimeToMs(t: string): number | null {
  const m = t.trim().match(/^(?:(\d+):)?(\d+):(\d+)[.:](\d+)$/)
  if (!m) return null
  const h = m[1] ? Number(m[1]) : 0
  const mm = Number(m[2])
  const ss = Number(m[3])
  const frac = m[4]
  const ms = Number(frac) * (frac.length === 2 ? 10 : 1)
  return ((h * 60 + mm) * 60 + ss) * 1000 + ms
}

function assToVtt(text: string): string {
  const out: string[] = ['WEBVTT']
  for (const raw of text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')) {
    if (!raw.startsWith('Dialogue:')) continue
    const parts = raw.slice('Dialogue:'.length).split(',')
    if (parts.length < 10) continue
    const start = assTimeToMs(parts[1].trim())
    const end = assTimeToMs(parts[2].trim())
    if (start === null || end === null) continue
    const body = parts
      .slice(9)
      .join(',')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .trim()
    if (!body) continue
    out.push('', `${vttTime(start)} --> ${vttTime(end)}`, body)
  }
  return out.join('\n')
}
