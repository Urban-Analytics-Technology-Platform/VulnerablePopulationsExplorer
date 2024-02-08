<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import proto from './pb/synthpop_pb';
</script>

<Dialog.Root>
	<Dialog.Trigger>Select Population</Dialog.Trigger>
	<Dialog.Content class="w-80">
		<Dialog.Header>
			<Dialog.Title>Define the population of interest</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Households</Card.Title>
					<Card.Description>Filter by household attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<ToggleGroup.Root size="sm" type="multiple">
						{#each Object.keys(proto.synthpop.AccommodationType) as house_type}
							<ToggleGroup.Item value={house_type}>{house_type}</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				</Card.Content>
				<Card.Footer>
					<p>200 households out of 1000</p>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>People</Card.Title>
					<Card.Description>Filter by people attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>200 people out of 1000</p>
				</Card.Footer>
			</Card.Root>
		</div>
	</Dialog.Content>
</Dialog.Root>
