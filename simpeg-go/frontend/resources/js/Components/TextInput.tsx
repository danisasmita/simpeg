import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
    ReactNode,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        icon,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean; icon?: ReactNode },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="relative">
            {icon && (
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {icon}
                </div>
            )}
            <input
                {...props}
                type={type}
                className={
                    'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a3a2a] focus:bg-white focus:ring-2 focus:ring-[#1a3a2a]/20 ' +
                    (icon ? 'pl-10 ' : '') +
                    className
                }
                ref={localRef}
            />
        </div>
    );
});
