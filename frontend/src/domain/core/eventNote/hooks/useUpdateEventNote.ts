import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventNoteApi } from '../api'
import type { EventNoteRequest } from '../type/api'
import { EVENT_NOTES_KEY } from './useEventNotes'

export const useUpdateEventNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EventNoteRequest }) =>
      eventNoteApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENT_NOTES_KEY }),
  })
}
