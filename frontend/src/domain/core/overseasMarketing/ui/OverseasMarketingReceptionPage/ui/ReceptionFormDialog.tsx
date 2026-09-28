import { useState } from 'react'
import { X } from 'lucide-react'
import type { OverseasMarketingReceptionInput } from '../../../type/api'
import { Button } from '#shared/ui/Button'

type FieldKey = keyof OverseasMarketingReceptionInput
type Field = {
  key: FieldKey
  label: string
  type?: 'date' | 'textarea'
  placeholder?: string
  required?: boolean
}

const FIELDS: Field[] = [
  { key: 'name', label: '이름', required: true },
  { key: 'inquiryDate', label: '문의일', type: 'date' },
  { key: 'nationality', label: '국적' },
  { key: 'gender', label: '성별', placeholder: '남 / 여' },
  { key: 'dob', label: '생년월일', placeholder: '1990-01-01' },
  { key: 'contact', label: '연락처', placeholder: '(+82) 010-...' },
  { key: 'email', label: '이메일' },
  { key: 'ethnicity', label: '민족' },
  { key: 'occupation', label: '직업' },
  { key: 'contactLens', label: '콘택트렌즈' },
  { key: 'departureSchedule', label: '출국예정' },
  // 검사일·수술일은 시트가 자유 텍스트("1/15, 1/17" 등)를 허용하므로 date 입력을 쓰지 않는다.
  { key: 'examDate', label: '검사일', placeholder: 'YYYY-MM-DD' },
  { key: 'surgeryDate', label: '수술일', placeholder: 'YYYY-MM-DD' },
  { key: 'surgeryCost', label: '수술비' },
  { key: 'channel', label: '유입경로' },
  { key: 'onlineChannel', label: '온라인채널' },
  { key: 'medicalConditions', label: '병력', type: 'textarea' },
  { key: 'medicationAllergy', label: '복용약/알레르기', type: 'textarea' },
  { key: 'remark', label: '비고', type: 'textarea' },
]

const INPUT_CLASS =
  'h-9 w-full rounded-md border border-border/80 bg-white px-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

interface ReceptionFormDialogProps {
  title: string
  initial: OverseasMarketingReceptionInput
  pending: boolean
  onSubmit: (input: OverseasMarketingReceptionInput) => void
  onClose: () => void
}

export function ReceptionFormDialog({ title, initial, pending, onSubmit, onClose }: ReceptionFormDialogProps) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')

  const setValue = (key: FieldKey, value: string) => setValues((current) => ({ ...current, [key]: value }))

  const submit = () => {
    if (!values.name.trim()) {
      setError('이름은 필수입니다.')
      return
    }
    setError('')
    onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[90vh] w-[46rem] flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <strong className="text-sm text-gray-900">{title}</strong>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <div className="grid grid-cols-3 gap-x-3 gap-y-3 text-xs">
            {FIELDS.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'col-span-3 flex flex-col gap-1' : 'flex flex-col gap-1'}>
                <span className="font-semibold text-gray-700">
                  {field.label}
                  {field.required && <span className="ml-0.5 text-red-500">*</span>}
                </span>
                {field.type === 'textarea' ? (
                  <textarea value={values[field.key]} onChange={(event) => setValue(field.key, event.target.value)} rows={2} className={`${INPUT_CLASS} h-auto resize-y py-1.5`} placeholder={field.placeholder} />
                ) : (
                  <input type={field.type === 'date' ? 'date' : 'text'} value={values[field.key]} onChange={(event) => setValue(field.key, event.target.value)} className={INPUT_CLASS} placeholder={field.placeholder} />
                )}
              </label>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <p className="mt-3 text-[11px] text-muted-foreground">
            고객번호·상태·검사비 등 CRM 파생값은 저장 대상이 아니며 조회 시 자동 매칭됩니다.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 px-4 py-3">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose} disabled={pending}>취소</Button>
          <Button type="button" size="sm" className="bg-blue-600 text-xs text-white hover:bg-blue-700" onClick={submit} disabled={pending}>
            {pending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
