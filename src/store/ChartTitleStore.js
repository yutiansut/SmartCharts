import { observable, action, computed, autorunAsync } from 'mobx';
import MenuStore from './MenuStore';
import AnimatedPriceStore from './AnimatedPriceStore';

export default class ChartTitleStore {
    constructor(mainStore) {
        this.mainStore = mainStore;
        autorunAsync(this.onContextReady.bind(this));
        this.menu = new MenuStore(mainStore);
        this.currentPrice = new AnimatedPriceStore();
    }

    @observable todayChange;
    @observable todayChangePercentage;
    @observable isPriceUp = false;
    @observable isVisible = false;

    get context() { return this.mainStore.chart.context; }
    @computed get symbolName() { return this.mainStore.chart.currentActiveSymbol.name; }
    @computed get decimalPlaces() { return this.mainStore.chart.currentActiveSymbol.decimal_places; }
    @computed get activeSymbols() { return this.mainStore.chart.activeSymbols; }

    @action.bound onSelectItem(symbolObj) {
        this.context.changeSymbol(symbolObj);
    }

    onContextReady() {
        if (this.context) {
            this.context.stx.append('createDataSet', () => {
                this.update();
            });
            this.update();
        }
    }

    update() {
        const stx = this.context.stx;
        const currentQuote = stx.currentQuote();
        const previousClose = currentQuote ? currentQuote.iqPrevClose : undefined;

        const hasData = (stx.chart.dataSet && stx.chart.dataSet.length) > 0;
        if (!hasData) return;

        let internationalizer = stx.internationalizer;
        let priceChanged = false;

        let todaysChange = 0;
        let todaysChangePct = 0;
        let currentPrice = currentQuote ? currentQuote.Close : '';
        if (currentPrice) {
            currentPrice = currentPrice.toFixed(this.decimalPlaces);
            let oldPrice = this.currentPrice.price;
            if (oldPrice !== currentPrice) {
                priceChanged = true;
            }
        }
        this.currentPrice.setPrice(currentPrice);
        if (priceChanged) {
            // Default to iqPrevClose if the developer hasn't set previousClose
            let previousClose = previousClose || (currentQuote ? currentQuote.iqPrevClose : null);

            if (currentQuote && previousClose) {
                todaysChange = CIQ.fixPrice(currentQuote.Close - previousClose);
                todaysChangePct = todaysChange / previousClose * 100;
                if (internationalizer) {
                    this.todayChangePercentage = internationalizer.percent2.format(todaysChangePct / 100);
                } else {
                    this.todayChangePercentage = `${todaysChangePct.toFixed(2)}%`;
                }
            }
            this.todayChange = Math.abs(todaysChange).toFixed(this.decimalPlaces);
        }

        if (todaysChangePct > 0) {
            this.isPriceUp = true;
        } else if (todaysChangePct < 0) {
            this.isPriceUp = false;
        }
        this.isVisible = hasData;
    }
}