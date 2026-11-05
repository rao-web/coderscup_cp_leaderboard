const TableSpinner = () => (
    <div className="my-10 flex min-w-full items-center justify-center">
        <div
            className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-gold border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
            aria-label="Loading"
        />
    </div>
);

export default TableSpinner;
