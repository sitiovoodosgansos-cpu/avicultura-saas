import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/layout/page-title";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  nextStep: string;
};

export function ModulePlaceholder({
  title,
  description,
  nextStep
}: ModulePlaceholderProps) {
  return (
    <main>
      <PageTitle title={title} description={description} />
      <Card>
        <p className="text-sm text-zinc-600">{nextStep}</p>
      </Card>
    </main>
  );
}

