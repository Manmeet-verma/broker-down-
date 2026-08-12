import IssueDetail from './page-client';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <IssueDetail />;
}