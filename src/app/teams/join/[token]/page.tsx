import JoinTeamClient from "./JoinTeamClient"

type JoinPageProps = {
  params: { token: string }
}

export default function JoinTeamPage({ params }: JoinPageProps) {
  return <JoinTeamClient token={params.token} />
}
