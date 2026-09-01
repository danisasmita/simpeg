import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const fadeInScale: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 20, rotateX: -5 },
    visible: {
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: { duration: 0.4, ease: 'easeOut' },
    },
};

export const card3dHover = {
    rest: {
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        z: 0,
        transition: { duration: 0.3, ease: 'easeOut' },
    },
    hover: {
        scale: 1.02,
        rotateX: 2,
        rotateY: -3,
        z: 10,
        transition: { duration: 0.3, ease: 'easeOut' },
    },
    tap: {
        scale: 0.98,
        rotateX: 0,
        rotateY: 0,
        z: 0,
        transition: { duration: 0.15 },
    },
};

export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        x: -10,
        rotateY: -2,
        filter: 'blur(4px)',
    },
    animate: {
        opacity: 1,
        x: 0,
        rotateY: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
    exit: {
        opacity: 0,
        x: 10,
        rotateY: 2,
        filter: 'blur(4px)',
        transition: { duration: 0.25 },
    },
};

export const modalBackdrop: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPanel: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.9,
        rotateX: -5,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        rotateX: 0,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        rotateX: 3,
        y: 10,
        transition: { duration: 0.2 },
    },
};

export const sidebarSlide: Variants = {
    hidden: { x: '-100%', opacity: 0.5 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: {
        x: '-100%',
        opacity: 0.5,
        transition: { duration: 0.25 },
    },
};
