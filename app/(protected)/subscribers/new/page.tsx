import { Metadata } from "next"
import { CreateSubscriberForm } from "@/components/subscribers/create-form"

export const metadata: Metadata = {
  title: "Add Subscriber | Sona Provisioning",
}

export default function CreateSubscriberPage() {
  return <CreateSubscriberForm />
}
