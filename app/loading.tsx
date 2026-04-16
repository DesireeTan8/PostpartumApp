export default function Loading() {
    return (
        <div className="flex min-h-dvh flex-1 items-center justify-center bg-canvas">
            <div
                className="size-9 animate-loading-spin rounded-full border-2 border-brand border-t-transparent"
                role="status"
                aria-label="Loading"
            />
        </div>
    );
}