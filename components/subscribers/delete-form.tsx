"use client"

import { useState, useTransition } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { deleteSubscriber } from "@/services/subscribers-actions"
import { iccidSchema } from "@/lib/validation/subscriber"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

const deleteSchema = z.object({
  iccid: iccidSchema,
})

type DeleteFormValues = z.infer<typeof deleteSchema>

export function DeleteSubscriberForm() {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const form = useForm<DeleteFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      iccid: "",
    },
    mode: "onChange",
  })

  const onConfirm = (values: DeleteFormValues) => {
    startTransition(async () => {
      try {
        await deleteSubscriber(values.iccid)
        toast.success(`Subscriber deleted: ${values.iccid}`)
        form.reset()
        setOpen(false)
      } catch (err) {
        const message = (err as Error).message || "Failed to delete subscriber"
        toast.error(message)
      }
    })
  }

  return (
    <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <CardHeader>
        <CardTitle className="text-2xl">Delete subscriber</CardTitle>
        <CardDescription>
          Enter the ICCID to permanently remove the subscriber.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ICCID</label>
          <Input {...form.register("iccid")} placeholder="8931XXXXXXXXXXXXXXXX" />
          {form.formState.errors.iccid && (
            <p className="text-xs text-destructive">{form.formState.errors.iccid.message}</p>
          )}
        </div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={!form.formState.isValid || isPending}
            >
              <Trash2 className="h-4 w-4" />
              {isPending ? "Deleting..." : "Delete subscriber"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the subscriber with ICCID{" "}
                <span className="font-mono">{form.getValues("iccid") || "—"}</span>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={form.handleSubmit(onConfirm)}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Confirm delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
