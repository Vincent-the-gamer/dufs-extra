// Prism 高亮 + Markdown 渲染（marked + marked-highlight）
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-ini'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-batch'
import 'prismjs/components/prism-powershell'
import 'prismjs/components/prism-markdown'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'

const LANG_ALIAS: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  fish: 'bash',
  ksh: 'bash',
  csh: 'bash',
  yml: 'yaml',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  svelte: 'markup',
  kt: 'kotlin',
  kts: 'kotlin',
  rs: 'rust',
  cpp: 'cpp',
  'c++': 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  md: 'markdown',
  dockerfile: 'docker',
  bat: 'batch',
  cmd: 'batch',
  ps1: 'powershell',
  license: '',
  txt: '',
  log: '',
  csv: '',
  tsv: '',
}

export function prismLang(ext: string): string | null {
  const lang = LANG_ALIAS[ext] ?? ext
  if (!lang) return null
  return Prism.languages[lang] ? lang : null
}

export function highlightCode(code: string, lang: string | null): string {
  if (lang && Prism.languages[lang]) return Prism.highlight(code, Prism.languages[lang], lang)
  return escapeHtml(code)
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const marked = new Marked(
  markedHighlight({
    langPrefix: 'language-',
    highlight(code, lang) {
      return highlightCode(code, lang ? (LANG_ALIAS[lang] ?? lang) : null)
    },
  }),
)

export function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string
}
