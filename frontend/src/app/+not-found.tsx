import { RouteLink } from '@/components/route-link';
import { Screen } from '@/components/screen';

export default function NotFoundScreen() {
  return (
    <Screen title="Página não encontrada" description="Este caminho não existe no Econimizou.">
      <RouteLink href="/" label="Voltar ao início" />
    </Screen>
  );
}
