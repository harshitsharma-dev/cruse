import React from 'react';
import { FormattedText } from './FormattedText';

// Example component to showcase the FormattedText capabilities
export const FormattedTextDemo = () => {
  const sampleText = `**Issues Summary:**

The following issues were identified during the cruise:

1. **Dining Service Issues**
   - Slow service in main restaurant
   - Food quality concerns
   - Limited vegetarian options

2. **Entertainment Problems**
   * Poor sound quality in theater
   * Limited show variety
   * Technical difficulties during performances

3. **Cabin Concerns**
   > Some guests reported cleanliness issues
   > Temperature control problems
   > Noise from adjacent cabins

**Resolution Steps:**
- Immediate staff retraining
- Equipment upgrades scheduled
- Guest compensation provided

*Note: These are sample issues for demonstration purposes.*

### Additional Notes
Regular monitoring and feedback collection will continue.`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">FormattedText Component Demo</h2>
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <FormattedText text={sampleText} />
      </div>
    </div>
  );
};

export default FormattedTextDemo;
