import { useEffect } from 'react';
import { Link } from 'react-router';

// Page titles follow the app's approved format "Page – Mmusic".
function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} – Mmusic`;
  }, [title]);
}

function Scaffold({ title, phase }: { title: string; phase: string }) {
  usePageTitle(title);
  return (
    <section className="w1-page" aria-labelledby="page-title">
      <span className="w1-badge">W1 — каркас</span>
      <h1 id="page-title" className="t-headline-lg">
        {title}
      </h1>
      <p className="t-body-md">Временная заглушка. Экран будет перенесён из утверждённого приложения в фазе {phase}.</p>
    </section>
  );
}

export const SearchPage = () => <Scaffold title="Поиск" phase="W4" />;
export const LibraryPage = () => <Scaffold title="Библиотека" phase="W4" />;
export const ProfilePage = () => <Scaffold title="Профиль" phase="W4–W5" />;

export function NotFoundPage() {
  usePageTitle('Страница не найдена');
  return (
    <section className="w1-page" aria-labelledby="page-title">
      <span className="w1-badge">W1 — каркас</span>
      <h1 id="page-title" className="t-headline-lg">
        Страница не найдена
      </h1>
      <p className="t-body-md">
        Такой страницы нет. <Link to="/home">На главную</Link>
      </p>
    </section>
  );
}
