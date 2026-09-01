import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const card3dVariants = {
    rest: {
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        z: 0,
        transition: { duration: 0.3, ease: 'easeOut' as const },
    },
    hover: {
        scale: 1.02,
        rotateX: 2,
        rotateY: -3,
        z: 10,
        transition: { duration: 0.3, ease: 'easeOut' as const },
    },
    tap: {
        scale: 0.98,
        rotateX: 0,
        rotateY: 0,
        z: 0,
        transition: { duration: 0.15 },
    },
};

interface Card3DProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode;
    className?: string;
    disableHover?: boolean;
}

export default function Card3D({
    children,
    className,
    disableHover = false,
    ...props
}: Card3DProps) {
    return (
        <motion.div
            className={cn(
                'rounded-xl border bg-card text-card-foreground shadow-sm',
                'transform-gpu [perspective:1000px]',
                className
            )}
            variants={disableHover ? undefined : card3dVariants}
            initial="rest"
            whileHover={disableHover ? undefined : 'hover'}
            whileTap={disableHover ? undefined : 'tap'}
            style={{ transformStyle: 'preserve-3d' }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
