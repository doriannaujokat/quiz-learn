import {QuestionDom, QuestionOptions} from "../quiz.js";
import {OperatorToString, findLanguageEntry, Operator} from "../utils.js";

export class NumberPyramid extends QuestionDom {
    protected _size: number = 3;
    protected _maxnum: number = 10;
    protected _minnum: number = 1;
    protected _operation: "+"|"-"|"*"|"/"|"%" = "+";
    protected _results: number[][] = [];
    protected _inputs: HTMLInputElement[][] = [];
    protected _pointResult: number = 0;

    constructor(options?: {size?: number, maxNum?: number, minNum?: number, operation?: Operator} & QuestionOptions) {
        super(options);
        if (options?.size !== undefined) this._size = options.size;
        if (options?.maxNum !== undefined) this._maxnum = options.maxNum;
        if (options?.minNum !== undefined) this._minnum = options.minNum;
        if (options?.operation !== undefined) this._operation = options.operation;
        this.generatePyramid();
    }

    protected generatePyramid() {
        const body = this.shadowRoot.getElementById('body');
        body.innerHTML = "";
        body.classList.toggle('pyramid', true);
        this._results = [];
        this._inputs = [];
        for (let i = 0; i < this._size; i++) {
            this._results.push([]);
            this._inputs.push([]);
            const row = document.createElement('div');
            row.classList.toggle('pyramid-row', true);
            for (let j = 0; j < this._size - i; j++) {
                const input = document.createElement('input');
                input.classList.toggle('pyramid-cell', true);
                input.type = "number";
                input.step = "1";
                input.pattern = "\\d*";
                this._inputs[i].push(input);
                this._results[i].push(this.generateValue(i, j));
                if (i === 0) {
                    input.value = this._results[i][j].toString();
                    input.readOnly = true;
                }
                row.appendChild(input);
            }
            body.appendChild(row);
        }
        this.applyTranslation();
    }

    protected generateValue(row: number, index: number): number {
        if (row === 0) return Math.round(Math.random() * (this._maxnum - this._minnum) + this._minnum);
        const left = this._results[row - 1][index];
        const right = this._results[row - 1][index + 1];
        switch (this._operation) {
            default:
            case "+":
                return left + right;
            case "-":
                return left - right;
            case "*":
                return left * right;
            case "/":
                return Math.floor(left / right);
            case "%":
                if (isNaN(left%right)) return 0;
                return left % right;
        }
    }

    override get QuestionPrompts() {
        return {
            default: "en",
            en: `Fill out the number pyramid using ${OperatorToString(this._operation, 'en')} (${this._operation}).`,
            de: `Fülle die Zahlenpyramide mithilfe von ${OperatorToString(this._operation, 'de')} (${this._operation}) aus.`,
        }
    }

    protected override check(): boolean {
        let correct = true;
        let correctCount = 0;
        let allCount = 0;
        for (let i = 1; i < this._size; i++) {
            for (let j = 0; j < this._size - i; j++) {
                allCount++;
                if (this._inputs[i][j].valueAsNumber !== this._results[i][j]) {
                    correct = false;
                    this._inputs[i][j].classList.toggle('incorrect', true);
                    // this._inputs[i][j].classList.toggle('correct', false);
                } else {
                    correctCount++;
                    this._inputs[i][j].classList.toggle('incorrect', false);
                    // this._inputs[i][j].classList.toggle('correct', true);
                }
            }
        }
        this._pointResult = Math.floor((correctCount / allCount)*this._points);
        return correct;
    }
    public override get points(): number {
        return this._pointResult;
    }


    protected override lock() {
        super.lock(...arguments);
        for (let input of this._inputs.flat()) {
            input.readOnly = true;
        }
    }

    static override get observedAttributes() {
        return super.observedAttributes.concat(['pyramid-size','pyramid-maxnum','pyramid-minnum','pyramid-operation']);
    }
    override attributeChangedCallback(name, oldValue, newValue) {
        return;
        if (this._settingsLocked) return;
        super.attributeChangedCallback(name, oldValue, newValue);
        if (name === 'pyramid-size') {
            this._size = parseInt(newValue ?? 3);
            this.generatePyramid();
        }
        if (name === 'pyramid-maxnum') {
            this._maxnum = parseInt(newValue ?? 10);
            this.generatePyramid();
        }
        if (name === 'pyramid-minnum') {
            this._minnum = parseInt(newValue ?? 1);
            this.generatePyramid();
        }
        if (name === 'pyramid-operation') {
            this._operation = newValue ?? "+";
            this.generatePyramid();
        }
    }
}
customElements.define('quiz-number-pyramid', NumberPyramid);
