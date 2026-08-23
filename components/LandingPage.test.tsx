import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

const noop = () => {};

describe('LandingPage', () => {
  it('renders the upload dropzone when no files are queued', () => {
    render(
      <LandingPage
        onFileSelect={noop}
        onRemoveFile={noop}
        onClearQueue={noop}
        onEditQueue={noop}
        files={[]}
      />
    );

    expect(screen.getByText('Drag PDFs here')).toBeInTheDocument();
    expect(screen.getByText('PDF Editor Pro')).toBeInTheDocument();
  });

  it('calls onFileSelect for each PDF chosen via the file input', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    render(
      <LandingPage
        onFileSelect={onFileSelect}
        onRemoveFile={noop}
        onClearQueue={noop}
        onEditQueue={noop}
        files={[]}
      />
    );

    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('ignores non-PDF files chosen via the file input', async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    render(
      <LandingPage
        onFileSelect={onFileSelect}
        onRemoveFile={noop}
        onClearQueue={noop}
        onEditQueue={noop}
        files={[]}
      />
    );

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('lists queued files and wires the remove button', () => {
    const onRemoveFile = vi.fn();
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
    render(
      <LandingPage
        onFileSelect={noop}
        onRemoveFile={onRemoveFile}
        onClearQueue={noop}
        onEditQueue={noop}
        files={[file]}
      />
    );

    expect(screen.getByText('report.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remove'));
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });
});
