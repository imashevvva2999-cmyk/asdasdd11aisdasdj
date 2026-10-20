import { Link } from 'react-router';

import './components.css';

/** A real destination or action only — no placeholder buttons (W3 decision D7). */
export type SectionAction = { label: string } & ({ to: string } | { onClick: () => void });

type SectionHeadProps = {
  title: string;
  /** id for the heading, so the section can be labelled by it (aria-labelledby). */
  id?: string;
  action?: SectionAction;
};

/** Section heading row from the A3 Home: title on the left, optional "See All"-style action on the right. */
export function SectionHead({ title, id, action }: SectionHeadProps) {
  return (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {action &&
        ('to' in action ? (
          <Link className="see-all" to={action.to}>
            {action.label}
          </Link>
        ) : (
          <button type="button" className="see-all" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
