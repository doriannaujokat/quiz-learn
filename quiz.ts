import {findLanguageEntry} from "./utils.js";

export type QuizOptions = {timeLimit?: number, maxAttempts?: number, domContainer?: Element};

export class Quiz {
    private _startTime: number = 0;
    private _maxAttempts: number = 0;

    private _timeLimit: number = 0;
    private _timedOut: boolean = false;
    private _timer: number;
    private _domContainer: Element = undefined;

    private _questions: QuestionDom[] = [];

    private _locked: boolean = false;

    private _listeners: Map<string,Set<Function>> = new Map();

    constructor(options?: QuizOptions) {
        if (options?.timeLimit !== undefined) this._timeLimit = options.timeLimit;
        if (options?.maxAttempts !== undefined) this._maxAttempts = options.maxAttempts;
        if (options?.domContainer !== undefined) this._domContainer = options.domContainer;
        this._startTime = Date.now();
        this.updateResults();
        setInterval(this.timerTick.bind(this), 500);
    }

    private timerTick() {
        const elapsed = Date.now() - this._startTime;
        let remaining = undefined;
        const hasTimeLimit = this._timeLimit !== undefined && this._timeLimit !== null && this._timeLimit > 0;
        if (hasTimeLimit) remaining = Math.max(0,(this._timeLimit*1000) - elapsed);
        this.emit("timerUpdate", elapsed, remaining);
        if (!this._timedOut && hasTimeLimit && remaining <= 0) {
            this._timedOut = true;
            this.emit('timeout');
            this.updateResults();
        }
    }

    public addQuestion<Q extends typeof QuestionDom>(questionType: Q, options?: ConstructorParameters<Q>[0]) {
        const question = new questionType(Object.assign({index: this._questions.length + 1, quiz: this, points: 1, maxAttempts: this._maxAttempts},options));
        this._questions.push(question);
        this._domContainer.appendChild(question);
        this.updateResults();
    }

    public get maxPoints(): number {
        const nonOptional = this._questions.filter(question => !question.optional);
        return nonOptional.reduce((acc,question) => acc + question.maxPoints,0);
    }
    public get points(): number {
        return this._questions.reduce((acc,question) => acc + question.points,0);
    }
    public get correctPercentage(): number {
        const nonOptional = this._questions.filter(question => !question.optional);
        return nonOptional.reduce((acc,question) => acc + question.correctPercentage,0) / nonOptional.length;
    }

    public notifyQuestionChange(question: QuestionDom) {
        this.updateResults();
    }

    private updateResults() {
        this.emit("resultsChange");
    }

    public on(event: "timeout", listener: () => void): void;
    public on(event: "timerUpdate", listener: (elapsed: number, remaining?: number) => void): void;
    public on(event: "resultsChange", listener: () => void): void;
    public on(event: string, listener: Function) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(listener);
    }
    public off(event: string, listener: Function) {
        if (!this._listeners.has(event)) return;
        this._listeners.get(event).delete(listener);
    }

    private emit(event: "timeout");
    private emit(event: "timerUpdate", elapsed: number, remaining?: number);
    private emit(event: "resultsChange");
    private emit(event: string, ...args: any[]) {
        if (!this._listeners.has(event)) return;
        this._listeners.get(event).forEach(listener => listener(...args));
    }
}

export class QuizDomMapper {
    private _quiz: Quiz;
    private _timerDom: HTMLElement;
    private _scoreDom: HTMLElement;
    private _containerDom: HTMLElement;

    constructor(doms: {timer: HTMLElement, score: HTMLElement, container: HTMLElement}, quiz: Quiz);
    constructor(doms: {timer: HTMLElement, score: HTMLElement, container: HTMLElement}, options: QuizOptions);
    constructor(doms: {timer: HTMLElement, score: HTMLElement, container: HTMLElement}, quiz: QuizOptions|Quiz) {
        if (quiz instanceof Quiz) this._quiz = quiz;
        else this._quiz = new Quiz(Object.assign({domContainer: doms.container}, quiz));
        this._timerDom = doms.timer;
        this._scoreDom = doms.score;
        this._quiz.on('timerUpdate', this.timerTick.bind(this));
        this._quiz.on('resultsChange', this.updateResults.bind(this));
    }

    private timerTick(elapsed: number, remaining?: number) {
        let time = remaining ?? elapsed;
        const hours = Math.floor(time / (1000*60*60));
        const minutes = Math.floor(time / (1000*60)) % 60;
        const seconds = Math.floor(time / (1000)) % 60;
        this._timerDom.innerText = `${hours > 0 ? `${hours.toString().padStart(2,'0')}:` : ''}${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    }

    public addQuestion<Q extends typeof QuestionDom>(questionType: Q, options?: ConstructorParameters<Q>[0]) {
        this._quiz.addQuestion(questionType, options);
    }

    private updateResults() {
        this._scoreDom.innerText = `${this._quiz.points} / ${this._quiz.maxPoints} (${(this._quiz.correctPercentage*100).toFixed(2)}%)`;
    }
}

export class QuizDom extends HTMLElement {
    public static template = `<link rel="stylesheet" href="/quiz-dom.css">
<div class="container">
    <div class="content" id="content">
        
    </div>
    <div class="stats">
        <div id="time"></div>
        <div id="score"></div>
    </div>
</div>`;
    private _sRoot: ShadowRoot;
    private _quiz: QuizDomMapper;

    constructor(options?: QuizOptions) {
        super();
        this._sRoot = this.attachShadow({ mode: 'closed' });
        this._sRoot.innerHTML = QuizDom.template;
        this._quiz = new QuizDomMapper({timer: this._sRoot.getElementById('time'), score: this._sRoot.getElementById('score'), container: this._sRoot.getElementById('content')}, options);
    }
}

export type QuestionOptions = {index?: number, points?: number, maxAttempts?: number, quiz?: Quiz, optional?: boolean} & object;

export class QuestionDom extends HTMLElement {
    public static template = `<link rel="stylesheet" href="/quiz-components.css">
<div class="container">
    <div class="question">
        <div class="header">
            <div class="header-row">
                <div id="index" style="display: none;"></div>
                <div id="prompt"></div>
                <div id="points"></div>
            </div>
            <div class="header-row">
                <div id="maxAttempts" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12,1L3,5c0,0,0,4,0,6c0,7.83,6.439,11.486,9,12c2.561-0.514,9-4.17,9-12c0-2,0-6,0-6L12,1z M13,18h-2v-2h2V18z M13,14h-2V6 h2V14z" />
                    </svg>
                    <div id="maxAttempts-label"></div>
                    <div id="maxAttempts-count"></div>
                </div>
            </div>
        </div>
        <div class="question-body" id="body">
    
        </div>
        <div class="question-footer">
            <div class="question-controls">
                <button class="question-check" id="check">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M23,12L12,1v5H3C1.895,6,1,6.895,1,8v8c0,1.105,0.895,2,2,2h9v5L23,12z M9,15.414l-3.357-3.357l1.414-1.414L9,12.586 l4.643-4.643l1.414,1.414L9,15.414z" />
                    </svg>
                    <span class="" id="check-label">Check</span>
                </button>
                <button class="question-check" id="locked" style="display: none;" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-lock-reason="none" style="display:none;">
                      <path d="M12 1C8.6761905 1 6 3.6761905 6 7L6 9.7207031C4.7585397 11.130211 4 12.97425 4 15C4 19.418 7.582 23 12 23C16.418 23 20 19.418 20 15C20 12.97425 19.24146 11.130211 18 9.7207031L18 7C18 3.6761905 15.32381 1 12 1 z M 12 3C14.27619 3 16 4.7238095 16 7L16 8.0800781C14.822119 7.3974831 13.459229 7 12 7C10.540771 7 9.1778813 7.3974831 8 8.0800781L8 7C8 4.7238095 9.7238095 3 12 3 z M 12 12C13.1 12 14 12.9 14 14C14 14.735 13.594 15.372703 13 15.720703L13 19L11 19L11 15.720703C10.406 15.372703 10 14.735 10 14C10 12.9 10.9 12 12 12 z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-lock-reason="timeout" style="display:none;">
                        <path d="M10 2C5.038 2 1 6.038 1 11C1 15.611 4.4878906 19.419547 8.9628906 19.935547C9.0208906 19.784547 9.0673906 19.630281 9.1503906 19.488281L9.4511719 18.972656L14.408203 10.472656C14.894203 9.6396562 15.762891 9.1164844 16.712891 9.0214844C16.809891 9.0114844 16.902953 8.984375 17.001953 8.984375C17.224953 8.984375 17.441297 9.0213125 17.654297 9.0703125C18.108297 9.1803125 18.531578 9.3905 18.892578 9.6875C18.254578 5.3465 14.516 2 10 2 z M 9 6L11 6L11 11.414062L7.7070312 14.707031L6.2929688 13.292969L9 10.585938L9 6 z M 17 10.984375C16.6645 10.984375 16.329719 11.149469 16.136719 11.480469L10.876953 20.496094C10.487953 21.163094 10.968234 22 11.740234 22L22.259766 22C23.031766 22 23.512047 21.163094 23.123047 20.496094L17.863281 11.480469C17.670281 11.149469 17.3355 10.984375 17 10.984375 z M 16 14L18 14L18 18L16 18L16 14 z M 16 19L18 19L18 21L16 21L16 19 z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-lock-reason="complete" style="display:none;">
                        <path d="M19,3h-4.184C14.403,1.837,13.304,1,12,1S9.597,1.837,9.184,3H5C3.895,3,3,3.895,3,5v14c0,1.105,0.895,2,2,2h14 c1.105,0,2-0.895,2-2V5C21,3.895,20.105,3,19,3z M8.707,10.293L11,12.586l4.293-4.293l1.414,1.414L11,15.414l-3.707-3.707 L8.707,10.293z M12,3c0.552,0,1,0.448,1,1c0,0.552-0.448,1-1,1s-1-0.448-1-1C11,3.448,11.448,3,12,3z" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</div>`;
    protected _points: number = 0;
    protected _qindex: number = undefined;
    protected _maxAttempts: number = 0;
    protected _optional: boolean = false;
    protected _attempts: number = 0;
    protected _locked: boolean = false;
    protected _settingsLocked: boolean = false;
    protected _quiz: Quiz = undefined;
    protected readonly _options: object;

    constructor(options?: QuestionOptions) {
        super();
        this._options = Object.seal(Object.create(options??null));
        if (options) this._settingsLocked = true;
        if (options?.index !== undefined) this._qindex = options.index;
        if (options?.points !== undefined) this._points = options.points;
        if (options?.maxAttempts !== undefined) this._maxAttempts = options.maxAttempts;
        if (options?.quiz !== undefined) this._quiz = options.quiz;
        if (options?.optional !== undefined) this._optional = options.optional;
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = QuestionDom.template;
        this.shadowRoot.getElementById('check').addEventListener('click', () => {
            if (this._locked || this._maxAttempts > 0 && this._attempts >= this._maxAttempts) return;
            if (this.check()) this.lock("complete");
            this._attempts++;
            if (this._maxAttempts > 0 && this._attempts >= this._maxAttempts) this.lock();
            this.applySettings();
            this._quiz?.notifyQuestionChange(this);
        });
        this._quiz?.on('timeout', this.onTimeout.bind(this));
        this.applySettings();
        this.applyTranslation();
    }

    getQuestionPrompt(lang?: readonly string[]|string): string {
        return findLanguageEntry(lang??navigator.languages, this.QuestionPrompts);
    }
    get QuestionPrompts(): Record<string,string>&{default: string} {
        return {
            default: "MISSING_QUESTION_PROMPT",
        }
    }
    protected onTimeout() {
        this.lock("timeout");
        this.check();
    }
    protected check(): boolean {
        return true;
    }
    public get correctPercentage(): number {
        return this.points / this.maxPoints;
    }
    public get points(): number {
        return 0;
    }
    public get maxPoints(): number {
        return this._points;
    }
    public get optional(): boolean {
        return this._optional;
    }
    protected lock(reason: "none"|"timeout"|"complete" = "none"): void {
        if (this._locked) return;
        this._locked = true;
        for (let child of <HTMLCollectionOf<HTMLElement>>this.shadowRoot.getElementById('locked').children) {
            if (child.dataset.lockReason === reason) child.style.display = '';
            else child.style.display = 'none';
        }
        this.shadowRoot.getElementById('check').style.display = 'none';
        this.shadowRoot.getElementById('locked').style.display = 'block';
        this._quiz?.notifyQuestionChange(this);
    }

    protected applyTranslation() {
        this.shadowRoot.getElementById('prompt').innerText = this.getQuestionPrompt(navigator.languages);
        this.shadowRoot.getElementById('check-label').innerText = findLanguageEntry(navigator.languages, {
            default: "en",
            en: "Check",
            de: "Überprüfen",
        });
        this.shadowRoot.getElementById('points').innerText = findLanguageEntry(navigator.languages, {
            default: "en",
            en: `(${this._points} points)`,
            de: `(${this._points} Punkte)`,
        });
        this.shadowRoot.getElementById('maxAttempts-label').innerText = findLanguageEntry(navigator.languages, {
            default: "en",
            en: `You only have ${this._maxAttempts} attempt${this._maxAttempts > 1 ? 's' : ''} for this question!`,
            de: `Du hast nur ${this._maxAttempts} Versuch${this._maxAttempts > 1 ? 'e' : ''} für diese Frage!`,
        });
    }
    protected applySettings() {
        if (this._qindex)  {
            this.shadowRoot.getElementById('index').innerText = `#${this._qindex}`;
            this.shadowRoot.getElementById('index').style.display = 'block';
        } else {
            this.shadowRoot.getElementById('index').innerText = '';
            this.shadowRoot.getElementById('index').style.display = 'none';
        }
        if (this._maxAttempts > 0) {
            this.shadowRoot.getElementById('maxAttempts').style.display = 'inline-flex';
            this.shadowRoot.getElementById('maxAttempts-count').innerText = `[${this._attempts} / ${this._maxAttempts}]`;
        } else {
            this.shadowRoot.getElementById('maxAttempts').style.display = 'none';
        }
        this._quiz?.notifyQuestionChange(this);
    }


    static get observedAttributes() {
        return ['qindex'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this._settingsLocked) return;
        if (name === 'qindex') {
            this._qindex = newValue !== undefined && newValue !== null ? parseInt(newValue) : undefined;
            if (isNaN(this._qindex)) this._qindex = undefined;
            this.applySettings();
        }
    }
}


customElements.define('quiz-question', QuestionDom);
customElements.define('quiz-dom', QuizDom);
