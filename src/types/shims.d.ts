// 无类型声明的旧 CJS 依赖
declare module 'jsmediatags' {
  const jsmediatags: {
    read: (
      file: string,
      callbacks: {
        onSuccess: (data: unknown) => void
        onError: (err: unknown) => void
      },
    ) => void
  }
  export default jsmediatags
}

declare module 'jsmediatags/dist/jsmediatags.min.js' {
  const jsmediatags: {
    read: (
      file: string,
      callbacks: {
        onSuccess: (data: unknown) => void
        onError: (err: unknown) => void
      },
    ) => void
  }
  export default jsmediatags
}
