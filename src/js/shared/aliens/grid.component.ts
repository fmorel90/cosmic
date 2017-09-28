import { Component, Input } from "@angular/core";

@Component({
	selector: "alien-grid",
	styles: [
		":host { display: flex; flex-wrap: wrap; align-items: stretch; }",
		":host > * { flex-basis: 25% }",
		"@media (max-width: 992px) { :host > * { flex-basis: 33% } }",
		"@media (max-width: 768px) { :host > * { flex-basis: 50% } }",
		"@media (max-width: 576px) { :host > * { flex-basis: 100% } }"
	],
	template: `<alien-card [alien]="alien" *ngFor="let alien of aliens"></alien-card>`
})
export class AlienGridComponent {
	@Input() public aliens: Alien[];
}