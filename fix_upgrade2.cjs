const fs = require('fs');

let content = fs.readFileSync('src/components/Upgrade.tsx', 'utf8');

const startStr = '{/* Balance Input */}';
const endStr = '</div>\n             </div>\n          </div>'; // We need to be careful not to delete too much

let startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
    let innerEnd = content.indexOf('</style>' /* dummy */); // just find the end manually
    // The balance block ends right before `</div>\n             </div>\n          </div>\n\n          {/* Right Card: Target */}`
    const rightCardIndex = content.indexOf('{/* Right Card: Target */}');
    if (rightCardIndex !== -1) {
        // the end of left card is just before rightCardIndex
        const leftCardEndStr = '</div>\n             </div>\n          </div>\n\n          {/* Right Card: Target */}';
        const replaceEnd = content.indexOf(leftCardEndStr);
        if (replaceEnd !== -1) {
            const before = content.substring(0, startIndex);
            const after = content.substring(replaceEnd);
            content = before + after;
        }
    }
}

fs.writeFileSync('src/components/Upgrade.tsx', content);
