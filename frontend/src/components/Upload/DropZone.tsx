import { useCallback } from "react"
import { useDropzone } from "react-dropzone"

interface Props {
  onUpload: (file: File) => void
  loading: boolean
}

export default function DropZone({ onUpload, loading }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    disabled: loading,
  })

  return (
    <><div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      {loading ? (
        <p className="text-gray-500">Uploading...</p>
      ) : isDragActive ? (
        <p className="text-blue-500">Drop your CSV here</p>
      ) : (
        <div>
          <p className="text-gray-600 font-medium">Drag & drop a CSV file here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse</p>
        </div>
      )}
    </div></>
  )
}