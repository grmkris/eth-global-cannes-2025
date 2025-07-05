import { Button } from "@workspace/ui/components/button";

export default function Page() {
	return (
		<div className="flex items-center justify-center min-h-svh p-4">
			<div className="flex flex-col items-center justify-center gap-6">
				<h1 className="text-3xl font-bold">ETH Global Cannes 2025</h1>
				<p className="text-muted-foreground text-center max-w-md">
					Welcome to ETH Global Cannes 2025
				</p>
				<div className="flex gap-2">
					<Button size="sm">Button</Button>
					<appkit-button />
				</div>
			</div>
		</div>
	);
}
