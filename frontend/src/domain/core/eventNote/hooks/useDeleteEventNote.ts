import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventNoteApi } from '../api'
import { EVENT_NOTES_KEY } from './useEventNotes'

export const useDeleteEventNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eventNoteApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENT_NOTES_KEY }),
  })
}
