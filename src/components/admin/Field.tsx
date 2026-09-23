'use client';
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement
} from 'react';

type ControlProps = {
  id?: string;
  children?: ReactNode;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/** Associate the label with the first native control, including input wrappers. */
export default function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const uid = useId();
  let controlId: string | undefined;
  function connect(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement(node) || controlId) return node;
      const element = node as ReactElement<ControlProps>;
      if (
        typeof element.type === 'string' &&
        ['input', 'select', 'textarea'].includes(element.type)
      ) {
        controlId = element.props.id ?? uid;
        return cloneElement(element, {
          id: controlId,
          'aria-invalid': !!error || undefined,
          'aria-describedby':
            [
              element.props['aria-describedby'],
              hint ? `${uid}-hint` : '',
              error ? `${uid}-error` : ''
            ]
              .filter(Boolean)
              .join(' ') || undefined
        });
      }
      return element.props.children
        ? cloneElement(element, {}, connect(element.props.children))
        : element;
    });
  }
  const content = connect(children);
  return (
    <div>
      {controlId ? (
        <label htmlFor={controlId} className="admin-label">
          {label}
        </label>
      ) : (
        <p className="admin-label">{label}</p>
      )}
      {content}
      {hint && (
        <p id={`${uid}-hint`} className="mt-1 text-xs text-stone-deep">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${uid}-error`}
          role="alert"
          className="mt-1 text-xs text-[#8c2f2f]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
