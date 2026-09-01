import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Skeleton3DProps {
    className?: string;
    count?: number;
}

function SkeletonPulse({ className }: { className?: string }) {
    return (
        <div className="relative overflow-hidden rounded-lg bg-muted">
            <motion.div
                className={cn('h-full w-full', className)}
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
}

export default function Skeleton3D({ className, count = 1 }: Skeleton3DProps) {
    if (count === 1) {
        return <SkeletonPulse className={className} />;
    }

    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonPulse key={i} className={className} />
            ))}
        </div>
    );
}
