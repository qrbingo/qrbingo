import {Model, Types} from 'chomex';

import BingoSlot, { IBingoSlotConfig } from './slot';
import { Payload } from './qrcode';

export interface IBingoConfig {
    sheet: {
        width: number;
        height: number;
    };
    slot: {
        variations: IBingoSlotConfig[];
    }
}

export default class BingoSheet extends Model {

    protected static __ns = 'BingoSheet';
    protected static schema = {
        width: Types.number,
        height: Types.number,
        slots: Types.arrayOf(
            Types.arrayOf(
                Types.reference(BingoSlot)
            )
        ),
        initialized: Types.date,
    }

    public width: number;
    public height: number;
    public slots: BingoSlot[][];
    public length: number;
    public initialized: Date;

    constructor(props: any) {
        super(props, 'singleton');
        this.width = props.width;
        this.height = props.height;
        this.slots = props.slots;
        this.length = this.width * this.height;
        this.initialized = props.date || new Date();
    }

    private static arrayShuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    private static getShuffledListWithLength(arr: IBingoSlotConfig[], length: number): IBingoSlotConfig[] {
        const dest: IBingoSlotConfig[] = [];
        while (dest.length < length) {
            dest.push(...this.arrayShuffle<IBingoSlotConfig>(arr))
        }
        return dest.slice(0, length);
    }

    private static createSlot(variation: IBingoSlotConfig, index: number, width: number): BingoSlot {
        const { value, label, description, imageURL } = variation;
        const [x, y] = [index % width, Math.floor(index / width)];
        const slot = new BingoSlot({ value, label, description, imageURL, position: { x, y } });
        return slot;
    }

    static init(config: IBingoConfig): BingoSheet {
        const {width, height} = config.sheet;
        const slots: BingoSlot[][] = Array(height).fill(true).map(() => []);
        const length = width * height;
        this.getShuffledListWithLength(config.slot.variations, length).map((v, i) => {
            const slot = this.createSlot(v, i, width);
            return slots[slot.position.y].push(slot);
        });
        const sheet = new BingoSheet({
            width: config.sheet.width,
            height: config.sheet.height,
            slots
        });
        return sheet;
    }

    static exists(): BingoSheet | undefined {
        return this.find<BingoSheet>('singleton');
    }

    /**
     * hit returns the slot which matches the given payload,
     * or undefined if not found.
     * @param payload
     */
    public hit(payload: Payload): BingoSlot | void {
        // eslint-disable-next-line
        return this.slots.flat().find((slot) => slot.value === payload.value);
    }

    /**
     * punch marks the given hit slot as punched.
     * @param hit
     */
    public punch(hit: BingoSlot): BingoSheet {
        // eslint-disable-next-line
        this.slots.flat().filter((slot) => slot.value === hit.value).map((slot) => {
            // slot.punched = true;
            const {x, y} = slot.position;
            this.slots[y][x].punched = true;
        });
        return this.save();
    }

    public isBingo(): boolean {
        return this.getBingo().length !== 0;
    }

    public getBingo(): BingoSlot[] {
        let bingo: BingoSlot[] = [];
        bingo = bingo.concat(this.getHorizontalBingo());
        bingo = bingo.concat(this.getVerticalBingo());
        bingo = bingo.concat(this.getDiagonalBingo());
        this.markSlotsIfBingo(bingo);
        return bingo;
    }

    private markSlotsIfBingo(bingo: BingoSlot[]) {
        bingo.map((slot) => this.slots[slot.position.y][slot.position.x].bingo = true);
    }

    /**
     * Return all the slots which constitute the horizontal bingo.
     */
    public getHorizontalBingo(): BingoSlot[] {
        for (let row = 0; row < this.height; row++) {
            if (this.slots[row].every((slot) => slot.punched)) {
                return this.slots[row];
            }
        }
        return [];
    }

    /**
     * Return all the slots which constitute the vertical bingo.
     */
    public getVerticalBingo(): BingoSlot[] {
        for (let col = 0; col < this.width; col++) {
            if (this.slots.every((row) => row[col].punched)) {
                return this.slots.map((row) => row[col]).flat();
            }
        }
        return [];
    }

    /**
     * Return all the slots which constitute the diagonal bingo.
     */
    public getDiagonalBingo(): BingoSlot[] {
        let bingo: BingoSlot[] = [];
        if (this.width === this.height) {
            const len = Math.min(this.width, this.height);
            const backslash = this.slots.map((row, i) => row[i]);
            if (backslash.every(slot => slot.punched)) {
                bingo = bingo.concat(backslash);
            }
            const slash = this.slots.map((row, i) => row[len - i - 1]);
            if (slash.every(slot => slot.punched)) {
                bingo = bingo.concat(slash);
            }
        } else {
            // TODO: Consider NON-SQUARE bingo sheet.
            return [];
        }
        return bingo;
    }
}