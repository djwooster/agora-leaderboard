import { PageHeader } from "@/components/layout/PageHeader"
import { CreateChallengeForm } from "@/components/challenge/CreateChallengeForm"

export const metadata = { title: "New Challenge – Agora" }

export default function NewChallengePage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Create challenge"
        backHref="/"
        backLabel="Home"
      />
      <CreateChallengeForm />
    </div>
  )
}
