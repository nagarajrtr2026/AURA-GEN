export class FrictionEngine {
    evaluateTelemetry(event) {
        const { cursorVelocity, hesitation, repeatedClicks, fieldErrors, activeField } = event.data;
        const score = Math.min(100, Number(cursorVelocity) * 0.35 + Number(hesitation) * 0.25 + Number(repeatedClicks) * 12 + Number(fieldErrors) * 18);
        let level = 'LOW';
        if (score >= 75) {
            level = 'HIGH';
        }
        else if (score >= 45) {
            level = 'MEDIUM';
        }
        const reason = level === 'HIGH'
            ? 'Interaction friction is elevated enough to justify a simplified adaptive workflow.'
            : level === 'MEDIUM'
                ? 'Moderate friction detected; monitor the experience closely.'
                : 'User interaction remains stable and no simplification is required.';
        return {
            level,
            score: Math.round(score),
            reason,
            activeField: typeof activeField === 'string' ? activeField : null,
        };
    }
}
