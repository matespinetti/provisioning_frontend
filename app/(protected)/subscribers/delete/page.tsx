import { Metadata } from "next"
import { DeleteSubscriberForm } from "@/components/subscribers/delete-form"

export const metadata: Metadata = {
  title: "Delete Subscriber | Sona Provisioning",
}

export default function DeleteSubscriberPage() {
  return <DeleteSubscriberForm />
}
