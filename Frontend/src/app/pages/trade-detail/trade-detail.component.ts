import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin, switchMap, map } from 'rxjs';
import { TradeService } from '../../services/trade.service';
import { PairService } from '../../services/pair.service';
import { ImageService, ImageEntry } from '../../services/image.service';
import { Trade, Pair } from '../../utils/models';
import { formatDate, formatDecimal, resultClass } from '../../utils/helpers';
import { TRADE_RESULT_LABELS, TRADE_DIRECTION_LABELS } from '../../utils/constants';

@Component({
  selector: 'app-trade-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trade-detail.component.html',
})
export class TradeDetailComponent implements OnInit {
  trade: Trade | null = null;
  pairs: Pair[] = [];
  pictures: ImageEntry[] = [];
  accountTrades: Trade[] = [];
  loading = true;
  uploading = false;
  error = '';

  lightboxIndex: number | null = null;

  readonly formatDate = formatDate;
  readonly formatDecimal = formatDecimal;
  readonly resultClass = resultClass;
  readonly resultLabels = TRADE_RESULT_LABELS;
  readonly directionLabels = TRADE_DIRECTION_LABELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tradeService: TradeService,
    private pairService: PairService,
    private imageService: ImageService,
  ) {}

  ngOnInit(): void {
    // Route is reused when navigating between trades via next/previous, so react to param changes
    this.route.paramMap.subscribe((params) => {
      const tradeId = Number(params.get('tradeId'));
      this.loadTrade(tradeId);
    });
  }

  private loadTrade(tradeId: number): void {
    this.loading = true;
    this.error = '';
    this.lightboxIndex = null;

    forkJoin({
      trade: this.tradeService.getById(tradeId),
      pairs: this.pairService.getAll(),
      images: this.imageService.getViewUrls(tradeId),
    }).pipe(
      switchMap(({ trade, pairs, images }) =>
        this.tradeService.getByAccount(trade.accountId).pipe(
          map((accountData) => ({ trade, pairs, images, accountTrades: accountData.trades }))
        )
      )
    ).subscribe({
      next: ({ trade, pairs, images, accountTrades }) => {
        this.trade = trade;
        this.pairs = pairs;
        this.pictures = images.urls;
        this.accountTrades = accountTrades;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message ?? 'Failed to load trade';
        this.loading = false;
      },
    });
  }

  private get currentTradeIndex(): number {
    return this.trade ? this.accountTrades.findIndex((t) => t.id === this.trade!.id) : -1;
  }

  get previousTrade(): Trade | null {
    const idx = this.currentTradeIndex;
    return idx > 0 ? this.accountTrades[idx - 1] : null;
  }

  get nextTrade(): Trade | null {
    const idx = this.currentTradeIndex;
    return idx >= 0 && idx < this.accountTrades.length - 1 ? this.accountTrades[idx + 1] : null;
  }

  goToPreviousTrade(): void {
    if (this.previousTrade) this.router.navigate(['/trades', this.previousTrade.id]);
  }

  goToNextTrade(): void {
    if (this.nextTrade) this.router.navigate(['/trades', this.nextTrade.id]);
  }

  getPairName(pairId: number): string {
    return this.pairs.find((p) => p.id === pairId)?.pair ?? '—';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    input.value = '';
    this.uploading = true;

    this.imageService.getUploadUrls(this.trade!.id, files.length).pipe(
      switchMap(({ urls }) =>
        forkJoin(files.map((file, i) => this.imageService.uploadFile(urls[i].uploadUrl, file)))
      ),
      switchMap(() => this.imageService.getViewUrls(this.trade!.id)),
    ).subscribe({
      next: ({ urls }) => {
        this.pictures = urls;
        this.uploading = false;
      },
      error: () => { this.uploading = false; },
    });
  }

  deletePicture(entry: ImageEntry): void {
    const idx = this.pictures.indexOf(entry);
    this.imageService.deleteImage(this.trade!.id, entry.objectName).subscribe({
      next: () => {
        this.pictures = this.pictures.filter((p) => p !== entry);
        if (this.lightboxIndex !== null) {
          if (this.pictures.length === 0) {
            this.lightboxIndex = null;
          } else if (this.lightboxIndex >= this.pictures.length) {
            this.lightboxIndex = this.pictures.length - 1;
          } else if (idx < this.lightboxIndex) {
            this.lightboxIndex--;
          }
        }
      },
    });
  }

  openLightbox(index: number): void { this.lightboxIndex = index; }
  closeLightbox(): void { this.lightboxIndex = null; }
  prevImage(): void { if (this.lightboxIndex !== null && this.lightboxIndex > 0) this.lightboxIndex--; }
  nextImage(): void { if (this.lightboxIndex !== null && this.lightboxIndex < this.pictures.length - 1) this.lightboxIndex++; }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.lightboxIndex === null) {
      if (event.key === 'ArrowLeft') this.goToPreviousTrade();
      if (event.key === 'ArrowRight') this.goToNextTrade();
      return;
    }
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowLeft') this.prevImage();
    if (event.key === 'ArrowRight') this.nextImage();
  }

  deleteTrade(): void {
    if (!this.trade) return;
    this.tradeService.delete(this.trade.id).subscribe({
      next: () => this.router.navigate(['/accounts', this.trade!.accountId]),
    });
  }
}
